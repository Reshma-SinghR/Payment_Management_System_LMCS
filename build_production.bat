@echo off
setlocal

echo [1/5] Cleaning old builds...
cd backend
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist *.spec del /s /q *.spec
for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
cd ..

cd electron
if exist release rmdir /s /q release
if exist dist rmdir /s /q dist
cd ..

echo [2/5] Collecting static files...
cd backend
if not exist static mkdir static
python manage.py collectstatic --noinput
cd ..

echo [3/5] Building backend EXE with PyInstaller...
cd backend
pyinstaller --noconfirm --onedir --console --add-data "core;core" --add-data "students;students" --add-data "payments;payments" --add-data "reports;reports" --add-data "config;config" --add-data "staticfiles;staticfiles" --collect-all rest_framework --collect-all django start_backend.py
cd ..
echo [4/5] Building React frontend...
cd frontend
call npm run build
cd ..

echo [5/5] Building Electron installer...
cd electron
call npm run dist
cd ..

echo Build process completed successfully!
pause
