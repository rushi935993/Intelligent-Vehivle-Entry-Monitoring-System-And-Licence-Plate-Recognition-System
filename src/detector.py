import cv2
import time
import re
from ultralytics import YOLO
import easyocr
from collections import deque, Counter
from src.parking_logic import allocate_slot, release_slot

# ================= MODELS =================
vehicle_model = YOLO("models/vehicle_detector.pt")
plate_model = YOLO("models/plate_detector.pt")
reader = easyocr.Reader(['en'], gpu=False)

# ================= SYSTEM STATE =================
SYSTEM_STATE = {"mode": "ENTRY"}

recent_vehicles = {}
plate_buffer = deque(maxlen=10)

# 🔥 IMPORTANT: shared mutable object
last_event = {
    "plate": "",
    "slot": "",
    "mode": "",
    "message": "",
    "timestamp": 0
}
COOLDOWN = 15

# 🔥 Stability variables
last_vehicle_time = 0
VEHICLE_HOLD_TIME = 2

# ================= STRICT INDIAN PLATE REGEX =================
STANDARD_REGEX = re.compile(
    r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{1,4}$'
)

BH_REGEX = re.compile(
    r'^[0-9]{2}BH[0-9]{4}[A-Z]{2}$'
)

# ================= HELPERS =================
def set_mode(new_mode: str):
    if new_mode in ["ENTRY", "EXIT"]:
        SYSTEM_STATE["mode"] = new_mode
        print(f"[MODE] {new_mode}")

def get_last_event():
    return last_event

def clean_text(text):
    text = text.upper().replace(" ", "")

    # OCR corrections
    text = text.replace("O", "0")
    text = text.replace("I", "1")
    text = text.replace("Z", "2")

    return re.sub(r'[^A-Z0-9]', '', text)

def preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2, fy=2)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh

# ================= MAIN FUNCTION =================
def generate_frames():
    global last_vehicle_time, last_event

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[ERROR] Camera not opened")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print("[INFO] Camera started")

    while True:
        ret, frame = cap.read()

        if not ret:
            print("[WARNING] Frame not received")
            continue

        frame = cv2.resize(frame, (640, 480))

        current_time = time.time()
        mode = SYSTEM_STATE["mode"]

        # ================= VEHICLE DETECTION =================
        results = vehicle_model(frame, conf=0.2, imgsz=640, verbose=False)
        boxes = results[0].boxes

        if len(boxes) > 0:
            last_vehicle_time = current_time
            print(f"[YOLO] Vehicles: {len(boxes)}")
        else:
            print("[YOLO] No detection")

        # Skip if unstable
        if current_time - last_vehicle_time > VEHICLE_HOLD_TIME:
            continue

        for v in boxes:
            x1, y1, x2, y2 = map(int, v.xyxy[0])
            vehicle_roi = frame[y1:y2, x1:x2]

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            if vehicle_roi.size == 0:
                continue

            # ================= PLATE DETECTION =================
            plate_results = plate_model(vehicle_roi, conf=0.2, verbose=False)

            for p in plate_results[0].boxes:
                px1, py1, px2, py2 = map(int, p.xyxy[0])
                plate_img = vehicle_roi[py1:py2, px1:px2]

                if plate_img.size == 0:
                    continue

                processed = preprocess(plate_img)
                ocr_results = reader.readtext(processed)

                for (_, text, conf) in ocr_results:
                    cleaned = clean_text(text)

                    print(f"[OCR RAW] {text} → CLEAN: {cleaned} ({conf:.2f})")

                    # STRICT VALIDATION
                    is_standard = STANDARD_REGEX.match(cleaned)
                    is_bh = BH_REGEX.match(cleaned)

                    if conf > 0.4 and (is_standard or is_bh):
                        print(f"[VALID PLATE] {cleaned}")
                        plate_buffer.append(cleaned)
                    else:
                        print(f"[REJECTED] {cleaned}")

                # ================= STABILIZATION =================
                if len(plate_buffer) >= 3:
                    plate, freq = Counter(plate_buffer).most_common(1)[0]

                    if freq >= 2:
                        print(f"[FINAL PLATE] {plate}")

                        # Cooldown
                        if plate in recent_vehicles:
                            if current_time - recent_vehicles[plate] < COOLDOWN:
                                continue

                        # ================= ENTRY =================
                        if mode == "ENTRY":
                            slot, _ = allocate_slot(plate)
                            if slot:
                                last_event["plate"] = plate
                                last_event["slot"] = slot
                                last_event["mode"] = "ENTRY"
                                last_event["message"] = f"✅ ENTRY: {plate} → Slot {slot}"
                                last_event["timestamp"] = int(time.time() * 1000)

                                print(f"[ENTRY DONE] {plate}")

                        # ================= EXIT =================
                        elif mode == "EXIT":
                            slot, _ = release_slot(plate)
                            if slot:
                                last_event["plate"] = plate
                                last_event["slot"] = slot
                                last_event["mode"] = "EXIT"
                                last_event["message"] = f"✅ EXIT: {plate} → Slot {slot}"
                                last_event["timestamp"] = int(time.time() * 1000)

                                print(f"[EXIT DONE] {plate}")

                        recent_vehicles[plate] = current_time
                        plate_buffer.clear()

        # ================= UI =================
        cv2.putText(frame, f"MODE: {mode}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = buffer.tobytes()

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n'
        )

    cap.release()