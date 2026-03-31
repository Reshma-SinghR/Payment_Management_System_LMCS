import sqlite3

def run():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    
    # Try multiple possible columns
    queries = [
        "UPDATE students_student SET bus_number = NULL WHERE bus_number = ''",
        "UPDATE students_student SET bus_id_id = NULL WHERE bus_id_id = ''"
    ]
    
    for q in queries:
        try:
            cursor.execute(q)
            print(f"Executed: {q} | Rows affected: {cursor.rowcount}")
        except sqlite3.OperationalError as e:
            print(f"Skipped: {q} | Reason: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run()
