import django
import os
import sys

# Add current directory to path so config can be found
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from payments.models import PaymentStatus

if __name__ == '__main__':
    print("Checking PaymentStatus records:")
    for ps in PaymentStatus.objects.all():
        print(f"ID: {ps.id}, Name: '{ps.name}'")
