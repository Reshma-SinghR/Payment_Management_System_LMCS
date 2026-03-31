@echo off
echo ========================================
echo Building Portable Django Backend...
echo ========================================

:: Check for PyInstaller
python -m pip install pyinstaller

:: Clean old builds
if exist build rmdir /s /q build
if exist dist\backend_server rmdir /s /q dist\backend_server

:: Run PyInstaller
:: --onedir: create a folder with the exe (stabler than onefile for Django)
:: --name: backend_server
:: --hidden-import: Ensure all apps are included
python -m PyInstaller --onedir --name backend_server ^
    --hidden-import=config.settings ^
    --hidden-import=core.apps ^
    --hidden-import=students.apps ^
    --hidden-import=payments.apps ^
    --hidden-import=reports.apps ^
    --hidden-import=django.contrib.admin ^
    --hidden-import=django.contrib.auth ^
    --hidden-import=django.contrib.contenttypes ^
    --hidden-import=django.contrib.sessions ^
    --hidden-import=django.contrib.messages ^
    --hidden-import=django.contrib.staticfiles ^
    --hidden-import=rest_framework ^
    --hidden-import=corsheaders ^
    --hidden-import=django_filters ^
    --collect-all django ^
    --collect-all rest_framework ^
    --collect-all django_filters ^
    --collect-all corsheaders ^
    backend_server.py

echo ========================================
echo Build Complete! 
echo Your portable backend is in: backend/dist/backend_server
echo ========================================
