import streamlit as st
import cv2
import time
import re
import pandas as pd
from ultralytics import YOLO
import easyocr
from collections import Counter
from parking_logic import allocate_slot, release_slot
import mysql.connector

# ================= STREAMLIT CONFIG =================
st.set_page_config(page_title="Smart Parking System", layout="wide")
st.title("🚗 Smart Vehicle Entry & Exit Monitoring System")

# ================= SESSION STATE =================
if "plate_buffer" not in st.session_state:
    st.session_state.plate_buffer = []

if "last_detected_time" not in st.session_state:
    st.session_state.last_detected_time = 0

if "final_plate" not in st.session_state:
    st.session_state.final_plate = None

if "last_message" not in st.session_state:
    st.session_state.last_message = ""

# ================= SIDEBAR =================
st.sidebar.header("Controls")
mode = st.sidebar.radio("Select Mode", ["ENTRY", "EXIT"])
camera_on = st.sidebar.toggle("Start Camera", value=False)

# ================= DATABASE =================
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456789",   # 🔴 CHANGE
    "database": "vehicle_parking"
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

# ================= MODELS =================
vehicle_model = YOLO("models/vehicle_detector.pt").to("cpu")
plate_model = YOLO("models/plate_detector.pt").to("cpu")
reader = easyocr.Reader(['en'], gpu=False)

# ================= CONSTANTS =================
FRAME_WIDTH = 960
FRAME_HEIGHT = 540

VEHICLE_CONF = 0.65
PLATE_CONF = 0.35
OCR_MIN_CONF = 0.25
ENTRY_COOLDOWN = 20

INDIAN_PLATE_REGEX = re.compile(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$')

# ================= HELPERS =================
def clean_plate_text(text):
    return re.sub(r'[^A-Z0-9]', '', text.upper())

def preprocess_plate(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    clahe = cv2.createCLAHE(2.0, (8, 8))
    gray = clahe.apply(gray)
    gray = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 15
    )
    return gray

# ================= UI PLACEHOLDERS =================
frame_placeholder = st.empty()
status_placeholder = st.empty()

# ================= CAMERA =================
if camera_on:
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    ret, frame = cap.read()
    cap.release()

    if not ret:
        st.error("❌ Camera frame not captured")
    else:
        frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
        current_time = time.time()

        vehicle_results = vehicle_model(frame, conf=VEHICLE_CONF, imgsz=640, verbose=False)

        for v in vehicle_results[0].boxes:
            x1, y1, x2, y2 = map(int, v.xyxy[0])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            vehicle_roi = frame[y1:y2, x1:x2]
            plate_results = plate_model(vehicle_roi, conf=PLATE_CONF, imgsz=640, verbose=False)

            for p in plate_results[0].boxes:
                px1, py1, px2, py2 = map(int, p.xyxy[0])
                plate_img = vehicle_roi[py1:py2, px1:px2]

                if plate_img.size == 0:
                    continue

                processed = preprocess_plate(plate_img)
                ocr_results = reader.readtext(processed, detail=1)

                for (_, text, conf) in ocr_results:
                    cleaned = clean_plate_text(text)
                    if conf >= OCR_MIN_CONF and INDIAN_PLATE_REGEX.match(cleaned):
                        st.session_state.plate_buffer.append(cleaned)

        # -------- STABILIZE PLATE --------
        final_plate = None
        if len(st.session_state.plate_buffer) >= 3:
            plate, freq = Counter(st.session_state.plate_buffer).most_common(1)[0]
            if freq >= 2:
                final_plate = plate

        # -------- FINAL ACTION --------
        if final_plate and (current_time - st.session_state.last_detected_time > ENTRY_COOLDOWN):
            if mode == "ENTRY":
                slot, msg = allocate_slot(final_plate)
                if slot:
                    st.session_state.last_message = f"✅ ENTRY SUCCESS: {final_plate} → Slot {slot}"
            else:
                slot, msg = release_slot(final_plate)
                if slot:
                    st.session_state.last_message = f"✅ EXIT SUCCESS: {final_plate} → Slot {slot}"

            st.session_state.last_detected_time = current_time
            st.session_state.plate_buffer.clear()
            st.session_state.final_plate = final_plate

        # -------- DRAW TEXT --------
        if st.session_state.final_plate:
            cv2.putText(
                frame,
                st.session_state.final_plate,
                (30, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.2,
                (0, 0, 255),
                3
            )

        frame_placeholder.image(frame, channels="BGR")

# ================= CONFIRMATION POPUP =================
if st.session_state.last_message:
    st.success(st.session_state.last_message)

# ================= DASHBOARD =================
st.divider()
st.subheader("📊 Parking Status")

conn = get_connection()
cursor = conn.cursor(dictionary=True)

cursor.execute("SELECT COUNT(*) AS total FROM parking_slots")
total = cursor.fetchone()["total"]

cursor.execute("SELECT COUNT(*) AS available FROM parking_slots WHERE is_available=TRUE")
available = cursor.fetchone()["available"]

occupied = total - available

cursor.execute("""
    SELECT plate_number, slot_id, entry_time
    FROM vehicle_entries
    WHERE exit_time IS NULL
""")
active = cursor.fetchall()
conn.close()

c1, c2, c3 = st.columns(3)
c1.metric("Total Slots", total)
c2.metric("Occupied Slots", occupied)
c3.metric("Available Slots", available)

if active:
    st.dataframe(pd.DataFrame(active), width="stretch")
else:
    st.info("No vehicles currently parked")
