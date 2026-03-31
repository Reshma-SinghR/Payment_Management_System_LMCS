import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def check():
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, admission_no, bus_id_id FROM students_student")
        rows = cursor.fetchall()
        print(f"Total rows: {len(rows)}")
        for row in rows:
            if row[2] == '':
                print(f"Row {row[0]} ({row[1]}) has empty string for bus_id_id")
            elif row[2] is None:
                pass # print(f"Row {row[0]} ({row[1]}) is NULL")
            else:
                pass # print(f"Row {row[0]} ({row[1]}) has value {row[2]}")

if __name__ == "__main__":
    check()
