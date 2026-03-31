import os
import sys
import multiprocessing
import logging
from logging.handlers import RotatingFileHandler
from waitress import serve
from config.wsgi import application

# Set the settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Configure Logging and Data Directory
electron_data_dir = os.environ.get('ELECTRON_APP_DATA_DIR')

# Fallback for packaged/frozen environment missing environment variable
if not electron_data_dir and getattr(sys, 'frozen', False):
    if os.name == 'nt':  # Windows
        electron_data_dir = os.path.expandvars(r'%APPDATA%\PaymentMag')
    else:
        electron_data_dir = os.path.join(os.path.expanduser('~'), '.paymentmag')

if not electron_data_dir:
    log_dir = os.path.join(os.getcwd(), 'logs')
else:
    log_dir = os.path.join(electron_data_dir, 'logs')

os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'backend.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=2),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def start_server():
    # We need to handle freeze_support for multiprocessing
    multiprocessing.freeze_support()
    
    # 1. Run migrations automatically
    logger.info("Starting backend initialization...")
    try:
        import django
        django.setup()
        from django.core.management import call_command
        
        # Ensure any missing migrations are generated and applied
        logger.info("[*] Checking for schema updates...")
        call_command('makemigrations', '--noinput')
        call_command('migrate', '--noinput')
        logger.info("[*] Database schema is up to date.")
        
        # 1.5. Ensure default Payment Statuses and Fee Categories exist
        from payments.models import PaymentStatus, FeeCategory
        default_statuses = ['Paid', 'Unpaid', 'Partial']
        for status in default_statuses:
            PaymentStatus.objects.get_or_create(name=status)
            
        default_fees = ['Tuition', 'Bus', 'CCA']
        for fee in default_fees:
            FeeCategory.objects.get_or_create(name=fee)
            
        logger.info("[*] Default database records verified.")
    except Exception as e:
        logger.error(f"[!] Migration/Startup Error: {e}", exc_info=True)
        # We don't exit here because the DB might already be correct 
        # but the migration state is messy.

    # 2. Start the server using Waitress
    logger.info("Starting Waitress server at http://127.0.0.1:8000")
    try:
        # Using waitress for production-ready serving on Windows
        serve(application, host='127.0.0.1', port=8000, threads=6)
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    start_server()
