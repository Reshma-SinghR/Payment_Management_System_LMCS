@echo off
cd "c:\workspace\assignments\fullstack\New folder\school-management 2\school-management\backend"
python manage.py makemigrations
python manage.py migrate
echo Migrations complete.
