from django.db import models
from django.utils import timezone
from students.models import Student

class FeeCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class CCAActivity(models.Model):
    name = models.CharField(max_length=100, unique=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class PaymentStatus(models.Model):
    name = models.CharField(max_length=50, unique=True) # e.g. Paid, Unpaid, Partial
    
    def __str__(self):
        return self.name

class StudentFeeMapping(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fee_mappings')
    academic_record = models.ForeignKey('students.StudentAcademicRecord', on_delete=models.CASCADE, related_name='fee_mappings', null=True, blank=True)
    academic_year_ref = models.ForeignKey('students.AcademicYear', on_delete=models.CASCADE, null=True, blank=True)
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    month = models.CharField(max_length=20)
    is_paid = models.BooleanField(default=False)
    academic_year = models.CharField(max_length=10, default='2024-25')

    class Meta:
        unique_together = ('student', 'fee_category', 'month', 'academic_year')

    def __str__(self):
        return f"{self.student.name} - {self.fee_category.name} ({self.month})"

from django.conf import settings

class ReceiptManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class Receipt(models.Model):
    receipt_no = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    date = models.DateField(db_index=True, default=timezone.now)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='receipts')
    academic_year_ref = models.ForeignKey('students.AcademicYear', on_delete=models.CASCADE, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.ForeignKey(PaymentStatus, on_delete=models.SET_NULL, null=True)
    academic_year = models.CharField(max_length=10, default='2024-25')
    description = models.TextField(blank=True, null=True)
    is_edited = models.BooleanField(default=False)
    
    # Soft delete fields
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='deleted_receipts'
    )

    objects = ReceiptManager()
    all_objects = models.Manager()
    
    def save(self, *args, **kwargs):
        from django.db import transaction
        if not self.receipt_no:
            with transaction.atomic():
                date_str = self.date.strftime('%d%m%y')
                prefix = f"REC{date_str}"
                # Get indices of all receipts for today, including soft-deleted ones
                receipt_nos = Receipt.all_objects.filter(receipt_no__startswith=prefix).values_list('receipt_no', flat=True)
                
                max_index = 0
                for r_no in receipt_nos:
                    try:
                        # Extract part after prefix
                        suffix = r_no[9:]
                        idx = int(suffix)
                        if idx > max_index:
                            max_index = idx
                    except (ValueError, IndexError):
                        continue
                
                next_index = str(max_index + 1).zfill(2)
                
                self.receipt_no = f"{prefix}{next_index}"
                print(f"Generated Receipt Number: {self.receipt_no} for date {self.date}")
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

class ReceiptItem(models.Model):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='items')
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.CharField(max_length=20)

class DailyCollection(models.Model):
    date = models.DateField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    academic_year = models.CharField(max_length=10, default='2024-25', db_index=True)
    academic_year_ref = models.ForeignKey('students.AcademicYear', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        unique_together = ('date', 'academic_year')

class MonthlyCollection(models.Model):
    month = models.PositiveSmallIntegerField() # 1-12
    year = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    academic_year = models.CharField(max_length=10, default='2024-25', db_index=True)
    academic_year_ref = models.ForeignKey('students.AcademicYear', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        unique_together = ('month', 'year', 'academic_year')

class ReceiptAuditLog(models.Model):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    change_details = models.JSONField() # {field: {old: val, new: val}}
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Audit for {self.receipt.receipt_no} at {self.timestamp}"
