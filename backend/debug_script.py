import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from students.models import Student
from payments.models import FeeCategory, StudentFeeMapping
from payments.utils import get_pending_fees_queryset, get_due_months, get_student_due_months

with open('debug_out.txt', 'w', encoding='utf-8') as f:
    f.write('---Students---\n')
    for s in Student.objects.all():
        f.write(f"{s.name} | Tuition: {s.tuition_fee} | Bus: {s.bus_fee} | CCA: {s.cca_fee} | Year: {getattr(s, 'academic_year', 'none')}\n")

    f.write('\n---Fee Cats---\n')
    for fc in FeeCategory.objects.all():
        f.write(f"{fc.name}\n")

    f.write('\n---Mappings---\n')
    for m in StudentFeeMapping.objects.all():
        f.write(f"{m.student.name} | {m.fee_category.name} | {m.month} | {m.academic_year} | {m.amount}\n")

    f.write('\n---Testing Due Months Logic---\n')
    s = Student.objects.first()
    if s:
        f.write(f"Student: {s.name}, Academic Year: {s.academic_year}\n")
        f.write(f"Start month: {s.starting_month}\n")
        ay = getattr(s, 'academic_year', '2024-25')
        due_months = get_student_due_months(s, ay)
        f.write(f"Due Months: {due_months}\n")
        qs = get_pending_fees_queryset(s.id, ay)
        f.write(f"Pending fee mappings from query: {qs.count()}\n")
