import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def fix():
    with connection.cursor() as cursor:
        cursor.execute("UPDATE students_student SET bus_number_id = NULL WHERE bus_number_id = ''")
        print(f"Updated {cursor.rowcount} rows")

if __name__ == "__main__":
    fix()
