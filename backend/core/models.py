from django.db import models

class SchoolSettings(models.Model):
    school_name = models.CharField(max_length=255, default="LOURDES MATA CENTRAL SCHOOL")
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    principal_name = models.CharField(max_length=255, blank=True, null=True)
    academic_year = models.CharField(max_length=20, default="2024-25")
    currency = models.CharField(max_length=10, default="INR")
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    
    # Trial License Fields
    installed_at = models.DateTimeField(null=True, blank=True)
    trial_days = models.IntegerField(default=15)

    class Meta:
        verbose_name = "School Settings"
        verbose_name_plural = "School Settings"

    def __str__(self):
        return self.school_name

class Backup(models.Model):
    file_name = models.CharField(max_length=255)
    file_path = models.TextField()
    file_size = models.BigIntegerField()  # in bytes
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, default="Success")

    def __str__(self):
        return self.file_name
