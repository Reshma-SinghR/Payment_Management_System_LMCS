import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student, Bus

def migrate_buses():
    print("Starting bus migration...")
    students_with_bus = Student.objects.exclude(bus_number__isnull=True).exclude(bus_number='')
    
    unique_buses = students_with_bus.values_list('bus_number', flat=True).distinct()
    print(f"Found unique bus numbers: {list(unique_buses)}")
    
    for bus_no in unique_buses:
        # Get or create the bus object. Using the highest bus fee from existing students for this bus number
        students_for_this_bus = students_with_bus.filter(bus_number=bus_no)
        max_fee = max([s.bus_fee for s in students_for_this_bus] + [0])
        
        bus_obj, created = Bus.objects.get_or_create(
            bus_number=bus_no,
            defaults={'monthly_fee': max_fee}
        )
        if created:
            print(f"Created Bus: {bus_no} with fee {max_fee}")
        
        # Link students
        updated_count = students_for_this_bus.update(bus_id=bus_obj)
        print(f"Linked {updated_count} students to Bus {bus_no}")

    print("Bus migration complete.")

if __name__ == "__main__":
    migrate_buses()
