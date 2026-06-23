from datetime import datetime
from src.db import get_connection

# ---------------- ENTRY ----------------
def allocate_slot(plate_number):
    conn = get_connection()
    cursor = conn.cursor()

    # Check if vehicle already parked (no exit yet)
    cursor.execute(
        """
        SELECT slot_id FROM vehicle_entries
        WHERE plate_number=%s AND exit_time IS NULL
        """,
        (plate_number,)
    )
    if cursor.fetchone():
        conn.close()
        return None, "Already Parked"

    # Find free slot
    cursor.execute(
        "SELECT slot_id FROM parking_slots WHERE is_available=TRUE LIMIT 1"
    )
    slot = cursor.fetchone()

    if not slot:
        conn.close()
        return None, "Parking Full"

    slot_id = slot[0]

    # Mark slot occupied
    cursor.execute(
        "UPDATE parking_slots SET is_available=FALSE WHERE slot_id=%s",
        (slot_id,)
    )

    # Insert entry
    cursor.execute(
        """
        INSERT INTO vehicle_entries (plate_number, slot_id, entry_time)
        VALUES (%s, %s, %s)
        """,
        (plate_number, slot_id, datetime.now())
    )

    conn.commit()
    conn.close()

    return slot_id, "Entry Successful"


# ---------------- EXIT ----------------
def release_slot(plate_number):
    conn = get_connection()
    cursor = conn.cursor()

    # Find active entry
    cursor.execute(
        """
        SELECT slot_id FROM vehicle_entries
        WHERE plate_number=%s AND exit_time IS NULL
        """,
        (plate_number,)
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        return None, "Vehicle Not Found"

    slot_id = row[0]

    # Update exit time
    cursor.execute(
        """
        UPDATE vehicle_entries
        SET exit_time=%s
        WHERE plate_number=%s AND exit_time IS NULL
        """,
        (datetime.now(), plate_number)
    )

    # Free slot
    cursor.execute(
        """
        UPDATE parking_slots
        SET is_available=TRUE
        WHERE slot_id=%s
        """,
        (slot_id,)
    )

    conn.commit()
    conn.close()

    return slot_id, "Exit Successful"

def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total FROM parking_slots")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) AS available FROM parking_slots WHERE is_available=TRUE")
    available = cursor.fetchone()["available"]

    cursor.execute("""
        SELECT plate_number, slot_id
        FROM vehicle_entries
        WHERE exit_time IS NULL
    """)
    active = cursor.fetchall()

    conn.close()

    return {
        "total": total,
        "available": available,
        "occupied": total - available,
        "active": active
    }

from src.db import get_connection

def get_parking_layout():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            p.slot_id,
            p.is_available,
            v.plate_number
        FROM parking_slots p
        LEFT JOIN vehicle_entries v
            ON p.slot_id = v.slot_id
            AND v.exit_time IS NULL
        ORDER BY p.slot_id
    """)

    slots = cursor.fetchall()

    cursor.close()
    conn.close()

    return slots