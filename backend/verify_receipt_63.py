import django
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from payments.models import Receipt

try:
    r = Receipt.objects.get(id=63)
    status = r.payment_status.name if r.payment_status else "None"
    print(f"Receipt {r.receipt_no} (ID: 63) for {r.student.name}: Status={status}, Date={r.date}")
except Receipt.DoesNotExist:
    print("Receipt ID 63 not found.")
except Exception as e:
    print(f"Error: {e}")
