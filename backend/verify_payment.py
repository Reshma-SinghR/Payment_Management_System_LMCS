import django
import os
import sys

# Add current directory to path so config can be found
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from payments.models import Receipt, StudentFeeMapping, ReceiptItem
from students.models import Student

if __name__ == '__main__':
    print("Listing ALL Students:")
    students = Student.objects.all()
    for s in students:
        print(f"\nStudent: {s.name} (Adm: {s.admission_no})")
        print("Fee Mappings:")
        for m in StudentFeeMapping.objects.filter(student=s).order_by('month'):
            print(f"  Month: {m.month}, Fee: {m.fee_category.name}, Amount: {m.amount}, Paid: {m.paid_amount}, Is Paid: {m.is_paid}")
        
        print("Receipts for this Student:")
        for r in Receipt.objects.filter(student=s, is_deleted=False).order_by('-date'):
            status_name = r.payment_status.name if r.payment_status else 'None'
            print(f"  Date: {r.date}, Receipt No: {r.receipt_no}, Amount: {r.total_amount}, Status: {status_name}")
            for item in r.items.all():
                print(f"    Item: {item.fee_category.name} ({item.month}), Amount: {item.amount}")
    
    print("\nListing ALL Receipts (including those without matching students listed above):")
    for r in Receipt.objects.all().order_by('-id')[:10]:
        print(f"Receipt ID: {r.id}, Student: {r.student.name if r.student else 'None'}, Amount: {r.total_amount}, Date: {r.date}")
