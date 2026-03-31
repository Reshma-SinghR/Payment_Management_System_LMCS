import os
import sys
import django
from django.core.management import execute_from_command_line

if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django.setup()

import logging

try:
    execute_from_command_line(['manage.py', 'migrate'])

    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin')

    # Seed essential structural categories if the database is explicitly empty
    from payments.models import FeeCategory, PaymentStatus
    if FeeCategory.objects.count() == 0:
        FeeCategory.objects.create(name='Tuition', description='Monthly tuition fee')
        FeeCategory.objects.create(name='Bus', description='School bus transportation fee')
        FeeCategory.objects.create(name='CCA', description='Co-curricular activities fee')
        FeeCategory.objects.create(name='Uniform', description='School uniform fee')

    if PaymentStatus.objects.count() == 0:
        PaymentStatus.objects.create(name='Paid')
        PaymentStatus.objects.create(name='Unpaid')
except Exception as e:
    log_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'SchoolPaymentSystem', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    logging.basicConfig(filename=os.path.join(log_dir, 'startup_error.log'), level=logging.ERROR)
    logging.exception("Failed during database initialization")
    # We choose not to sys.exit(1) explicitly so runserver can attempt to run 
    # and print errors if run from console, but it will likely crash later if DB is completely broken.

execute_from_command_line([
    'manage.py',
    'runserver',
    '127.0.0.1:8000',
    '--noreload',
    '--insecure'
])
