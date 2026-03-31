from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)
    start_year = models.IntegerField(db_index=True, default=2024)
    end_year = models.IntegerField(default=2025)
    start_date = models.DateField(default='2024-04-01')
    end_date = models.DateField(default='2025-03-31')
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_year']

    def __str__(self):
        return self.name

@receiver(post_save, sender=AcademicYear)
def seed_default_buses(sender, instance, created, **kwargs):
    if created:
        from .models import Bus
        for i in range(1, 6):
            Bus.objects.get_or_create(
                bus_number=f"Bus {i}",
                academic_year=instance,
                defaults={'monthly_fee': 0.00}
            )

class SchoolClass(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Bus(models.Model):
    bus_number = models.CharField(max_length=50)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='buses', null=True, blank=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('bus_number', 'academic_year')
        verbose_name_plural = "Buses"

    def __str__(self):
        return f"{self.bus_number} - {self.academic_year.name if self.academic_year else 'No Year'} (₹{self.monthly_fee})"

class Student(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )

    admission_no = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=150)
    student_class = models.CharField(max_length=50, db_index=True)
    division = models.CharField(max_length=20, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    bus_number = models.ForeignKey(Bus, on_delete=models.SET_NULL, blank=True, null=True, related_name='students')
    bus_stop = models.CharField(max_length=150, blank=True, null=True)
    bus_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cca_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    starting_month = models.CharField(max_length=20, default='April')
    starting_year = models.IntegerField(default=2024)
    academic_year = models.CharField(max_length=10, default='2024-25', db_index=True)
    is_special_case = models.BooleanField(default=False)
    special_case_details = models.TextField(blank=True, null=True)
    cca_activities = models.ManyToManyField('payments.CCAActivity', blank=True, related_name='students')

    class Meta:
        unique_together = ('admission_no', 'academic_year')

    def __str__(self):
        return f"[{self.academic_year}] {self.admission_no} - {self.name}"

class StudentAcademicRecord(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='academic_records')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    student_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    division = models.CharField(max_length=20)
    class_fee_start_date = models.DateField()
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    bus_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cca_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    carry_forward_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Student.STATUS_CHOICES, default='Active')

    class Meta:
        unique_together = ('student', 'academic_year')

    def __str__(self):
        return f"{self.student.name} - {self.academic_year.name}"
