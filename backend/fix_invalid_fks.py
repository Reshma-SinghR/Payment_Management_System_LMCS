import sqlite3
import os

db_path = 'db.sqlite3'

def fix_invalid_fks():
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current state
    cursor.execute("SELECT id, bus_number_id FROM students_student WHERE bus_number_id = ''")
    invalid_rows = cursor.fetchall()
    print(f"Found {len(invalid_rows)} rows with empty bus_number_id.")
    
    if invalid_rows:
        print("Setting empty bus_number_id to NULL...")
        cursor.execute("UPDATE students_student SET bus_number_id = NULL WHERE bus_number_id = ''")
        conn.commit()
        print("Update complete.")
    
    conn.close()

if __name__ == "__main__":
    fix_invalid_fks()
