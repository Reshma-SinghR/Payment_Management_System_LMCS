import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student

def cleanup_bus_data():
    print("Cleaning up student bus data...")
    # Set bus_number to None where it is an empty string
    updated = Student.objects.filter(bus_number='').update(bus_number=None)
    print(f"Set bus_number to None for {updated} students with empty strings.")

if __name__ == "__main__":
    cleanup_bus_data()
