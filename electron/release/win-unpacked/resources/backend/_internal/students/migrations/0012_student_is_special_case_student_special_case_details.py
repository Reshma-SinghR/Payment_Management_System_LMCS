from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('students', '0011_student_bus_stop'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='is_special_case',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='student',
            name='special_case_details',
            field=models.TextField(blank=True, null=True),
        ),
    ]
