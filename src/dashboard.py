import streamlit as st
import pandas as pd
import mysql.connector
from streamlit_autorefresh import st_autorefresh

# ---------------- DATABASE CONFIG ----------------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456789",  # 🔴 CHANGE THIS
    "database": "vehicle_parking"
}
# ------------------------------------------------

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

# ---------------- PAGE CONFIG ----------------
st.set_page_config(
    page_title="Vehicle Parking Dashboard",
    layout="wide"
)

st.title("🚗 Vehicle Parking Monitoring Dashboard")
st.caption("Live data from MySQL database")

# ---------------- AUTO REFRESH ----------------
st_autorefresh(interval=5000, key="parking_refresh")  # 5 seconds

# ---------------- FETCH DATA ----------------
conn = get_connection()
cursor = conn.cursor(dictionary=True)

# Total slots
cursor.execute("SELECT COUNT(*) AS total FROM parking_slots")
total_slots = cursor.fetchone()["total"]

# Available slots
cursor.execute("SELECT COUNT(*) AS available FROM parking_slots WHERE is_available=TRUE")
available_slots = cursor.fetchone()["available"]

# Occupied slots
occupied_slots = total_slots - available_slots

# Active parked vehicles
cursor.execute("""
    SELECT plate_number, slot_id, entry_time
    FROM vehicle_entries
    WHERE exit_time IS NULL
    ORDER BY entry_time DESC
""")
active_entries = cursor.fetchall()

conn.close()

# ---------------- METRICS ----------------
col1, col2, col3 = st.columns(3)

col1.metric("🅿️ Total Slots", total_slots)
col2.metric("🚘 Occupied Slots", occupied_slots)
col3.metric("✅ Available Slots", available_slots)

st.divider()

# ---------------- CURRENT VEHICLES TABLE ----------------
st.subheader("📋 Currently Parked Vehicles")

if active_entries:
    df = pd.DataFrame(active_entries)
    df.rename(columns={
        "plate_number": "Plate Number",
        "slot_id": "Slot Number",
        "entry_time": "Entry Time"
    }, inplace=True)

    st.dataframe(df, use_container_width=True)
else:
    st.info("No vehicles currently parked")

st.divider()

# ---------------- SLOT OVERVIEW ----------------
st.subheader("🧭 Slot Occupancy Overview")

conn = get_connection()
cursor = conn.cursor(dictionary=True)

cursor.execute("""
    SELECT p.slot_id,
           p.is_available,
           v.plate_number
    FROM parking_slots p
    LEFT JOIN vehicle_entries v
        ON p.slot_id = v.slot_id AND v.exit_time IS NULL
    ORDER BY p.slot_id
""")

slot_data = cursor.fetchall()
conn.close()

slot_df = pd.DataFrame(slot_data)
slot_df["Status"] = slot_df["is_available"].apply(
    lambda x: "Available ✅" if x else "Occupied 🚗"
)

slot_df.rename(columns={
    "slot_id": "Slot Number",
    "plate_number": "Vehicle Plate"
}, inplace=True)

slot_df.drop(columns=["is_available"], inplace=True)

st.dataframe(slot_df, use_container_width=True)
