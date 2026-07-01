import cv2
import time
import re
from ultralytics import YOLO
import easyocr
from collections import deque, Counter
from src.parking_logic import allocate_slot, release_slot

# ================= MODELS =================
vehicle_model = YOLO("yolov8n.pt")
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
def detect_plate(vehicle_roi):

    plate_results = plate_model(
        vehicle_roi,
        conf=0.2,
        verbose=False
    )

    plate_boxes = []

    for plate in plate_results[0].boxes:
        plate_boxes.append(plate)

    print(f"Plates Found: {len(plate_boxes)}")

    return plate_boxes

# def extract_plate_text(plate_img):
#     print("STEP 1")
#     # Upscale image for better OCR
#     plate_img = cv2.resize(
#         plate_img,
#         None,
#         fx=3,
#         fy=3,
#         interpolation=cv2.INTER_CUBIC
#     )
#     print("STEP 2")
#     gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
#     print("STEP 3")
    

#     if len(plate_buffer) == 0:
#         return None

#     plate = Counter(plate_buffer).most_common(1)[0][0]

#     return plate

def extract_plate_text(plate_img):

    # ---------- Resize ----------
    plate_img = cv2.resize(
        plate_img,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC
    )

    # ---------- Pre-processing ----------
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)

    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    _, thresh = cv2.threshold(
        blur,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    adaptive = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2
    )

    variants = [
        gray,
        thresh,
        adaptive
    ]

    detected_plates = []

    # ---------- OCR ----------
    for img in variants:

        results = reader.readtext(
            img,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        )

        for (_, text, conf) in results:

            cleaned = clean_text(text)

            print(f"[OCR] {cleaned} ({conf:.2f})")

            standard = STANDARD_REGEX.match(cleaned)
            bh = BH_REGEX.match(cleaned)

            if conf >= 0.40 and (standard or bh):

                detected_plates.append(cleaned)

    if len(detected_plates) == 0:
        return None

    final_plate = Counter(detected_plates).most_common(1)[0][0]

    print(f"[FINAL OCR] {final_plate}")

    return final_plate

def process_parking_event(plate, vehicle_type, current_time):

    mode = SYSTEM_STATE["mode"]

    # ---------------- Duplicate Check ----------------
    if plate in recent_vehicles:
        if current_time - recent_vehicles[plate] < COOLDOWN:
            return False

    # ---------------- ENTRY ----------------
    if mode == "ENTRY":

        slot, message = allocate_slot(
            plate,
            vehicle_type
        )

        if slot:

            last_event["plate"] = plate
            last_event["slot"] = slot
            last_event["mode"] = "ENTRY"
            last_event["message"] = f"✅ ENTRY: {plate} → Slot {slot}"
            last_event["timestamp"] = int(time.time() * 1000)

            print(f"[ENTRY DONE] {plate}")

    # ---------------- EXIT ----------------
    else:

        slot, message = release_slot(plate)

        if slot:

            last_event["plate"] = plate
            last_event["slot"] = slot
            last_event["mode"] = "EXIT"
            last_event["message"] = f"✅ EXIT: {plate} → Slot {slot}"
            last_event["timestamp"] = int(time.time() * 1000)

            print(f"[EXIT DONE] {plate}")

    recent_vehicles[plate] = current_time

    return True

def process_uploaded_image(image_path):

    print("=" * 50)
    print("PROCESS_UPLOADED_IMAGE CALLED")
    print("Image Path:", image_path)
    print("=" * 50)

    frame = cv2.imread(image_path)

    if frame is None:
        return {
            "success": False,
            "message": "Unable to read image"
        }

    # Resize like live camera
    frame = cv2.resize(frame, (640, 480))

    # Detect Vehicles
    vehicle_boxes = detect_vehicles(frame)

    total_plates = 0

    for vehicle in vehicle_boxes:

        box = vehicle["box"]
        vehicle_type = vehicle["type"]

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        vehicle_roi = frame[y1:y2, x1:x2]

        if vehicle_roi.size == 0:
            continue

        plate_boxes = detect_plate(vehicle_roi)
        final_plate = None

        for plate in plate_boxes:

            px1, py1, px2, py2 = map(int, plate.xyxy[0])

            plate_roi = vehicle_roi[py1:py2, px1:px2]

            if plate_roi.size == 0:
                continue
            print("Calling extract_plate_text()")
            plate_text = extract_plate_text(plate_roi)
            print("OCR Result:", plate_text)
            if plate_text:

                final_plate = plate_text

                print(f"FINAL PLATE : {final_plate}")

                if final_plate:

                        mode = SYSTEM_STATE["mode"]

                        process_parking_event(
                            final_plate,
                            vehicle_type,
                            time.time()
                        )

        total_plates += len(plate_boxes)

    print(f"Vehicles Found : {len(vehicle_boxes)}")
    print(f"Plates Found   : {total_plates}")

    return {
    "success": True,
    "vehicles": len(vehicle_boxes),
    "plates": total_plates,
    "plate_number": final_plate
    }

def detect_vehicles(frame):

    results = vehicle_model(
        frame,
        conf=0.6,
        imgsz=640,
        verbose=False
    )

    vehicles = []
    for box in results[0].boxes:

        cls = int(box.cls[0])
        conf = float(box.conf[0])

        print(
            f"Detected: {vehicle_model.names[cls]} | Confidence: {conf:.2f}"
        )

        # car, motorcycle, bus, truck
        if cls in [2, 3, 5, 7] and conf >= 0.5:

            vehicles.append({
                "box": box,
                "type": get_vehicle_type(cls)
            })

    print(f"Filtered Vehicles: {len(vehicles)}")

    return vehicles

def get_vehicle_type(class_id):

    vehicle_map = {
        2: "Car",
        3: "Motorcycle",
        5: "Bus",
        7: "Truck"
    }

    return vehicle_map.get(class_id, "Unknown")

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
        vehicles = detect_vehicles(frame)

        if vehicles:
            last_vehicle_time = current_time
            print(f"[YOLO] Vehicles: {len(vehicles)}")
        else:
            print("[YOLO] No Detection")

        # Ignore temporary frame drops
        if current_time - last_vehicle_time > VEHICLE_HOLD_TIME:
            continue

        # ================= PROCESS EACH VEHICLE =================
        for vehicle in vehicles:

            box = vehicle["box"]
            vehicle_type = vehicle["type"]

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            vehicle_roi = frame[y1:y2, x1:x2]

            if vehicle_roi.size == 0:
                continue

            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            # ================= PLATE DETECTION =================
            plate_boxes = detect_plate(vehicle_roi)

            for plate_box in plate_boxes:

                px1, py1, px2, py2 = map(int, plate_box.xyxy[0])

                plate_roi = vehicle_roi[py1:py2, px1:px2]

                if plate_roi.size == 0:
                    continue

                plate = extract_plate_text(plate_roi)

                if plate:
                    print(f"[VALID PLATE] {plate}")
                    plate_buffer.append(plate)

            # ================= STABILIZATION =================
            if len(plate_buffer) < 3:
                continue

            final_plate, freq = Counter(plate_buffer).most_common(1)[0]

            if freq < 2:
                continue

            print(f"[FINAL PLATE] {final_plate}")

            # Cooldown
            process_parking_event(
                final_plate,
                vehicle_type,
                current_time
            )

            plate_buffer.clear()

        # ================= UI =================
        cv2.putText(
            frame,
            f"MODE: {mode}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 0, 0),
            2,
        )

        _, buffer = cv2.imencode(".jpg", frame)

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )

    cap.release()