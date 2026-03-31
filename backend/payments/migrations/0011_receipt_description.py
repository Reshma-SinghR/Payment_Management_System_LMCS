from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0010_dailycollection_academic_year_ref_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='receipt',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
    ]
