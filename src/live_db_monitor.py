import time
import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="123456789",
    database="vehicle_parking"
)

cursor = conn.cursor()

print("📡 Live DB Monitor Started (Ctrl+C to stop)")

while True:
    cursor.execute("SELECT COUNT(*) FROM vehicle_entries")
    count = cursor.fetchone()[0]
    print(f"🅿️ Total entries: {count}")
    time.sleep(2)
