import os
import sys
import shutil
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse, Http404
from .models import SchoolSettings, Backup
from .serializers import SchoolSettingsSerializer, BackupSerializer

class RootAPIView(APIView):
    def get(self, request):
        return Response({
            "status": "online",
            "message": "School Management System API is running",
            "version": "1.0.0"
        })

class BackupListCreateAPIView(APIView):
    def get(self, request):
        backups = Backup.objects.all().order_by('-created_at')
        serializer = BackupSerializer(backups, many=True)
        return Response(serializer.data)

    def post(self, request):
        try:
            db_path = settings.DATABASES['default']['NAME']
            # Robust path management for Electron/Local
            if getattr(sys, 'frozen', False):
                base_storage = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'SchoolPaymentSystem')
            else:
                base_storage = settings.BASE_DIR
            backup_dir = os.path.join(base_storage, 'backups')
            
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"backup_{timestamp}.sqlite3"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # Use copy2 to preserve metadata
            shutil.copy2(db_path, backup_path)
            
            # Store metadata in DB
            file_size = os.path.getsize(backup_path)
            backup_record = Backup.objects.create(
                file_name=backup_filename,
                file_path=backup_path,
                file_size=file_size,
                status="Success"
            )
            
            serializer = BackupSerializer(backup_record)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Optionally record failure
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackupDownloadAPIView(APIView):
    def get(self, request, pk):
        try:
            backup = Backup.objects.get(pk=pk)
            if os.path.exists(backup.file_path):
                return FileResponse(
                    open(backup.file_path, 'rb'), 
                    as_attachment=True, 
                    filename=backup.file_name
                )
            else:
                return Response({'error': 'File not found on disk'}, status=status.HTTP_404_NOT_FOUND)
        except Backup.DoesNotExist:
            raise Http404
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SettingsView(APIView):
    def get(self, request):
        try:
            settings_obj = SchoolSettings.objects.first()
            if not settings_obj:
                settings_obj = SchoolSettings.objects.create()
            
            # Set installation timestamp on first access if not set
            if not settings_obj.installed_at:
                settings_obj.installed_at = timezone.now()
                settings_obj.save(update_fields=['installed_at'])
                
            serializer = SchoolSettingsSerializer(settings_obj)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        settings_obj = SchoolSettings.objects.first()
        if not settings_obj:
            settings_obj = SchoolSettings.objects.create()
        serializer = SchoolSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LicenseStatusAPIView(APIView):
    def get(self, request):
        settings_obj = SchoolSettings.objects.first()
        if not settings_obj:
            settings_obj = SchoolSettings.objects.create()
            settings_obj.installed_at = timezone.now()
            settings_obj.save()
            
        if not settings_obj.installed_at:
            settings_obj.installed_at = timezone.now()
            settings_obj.save()
            
        installed_at = settings_obj.installed_at
        trial_days = settings_obj.trial_days
        now = timezone.now()
        
        elapsed = now - installed_at
        days_remaining = max(0, trial_days - elapsed.days)
        is_expired = elapsed.days >= trial_days
        
        return Response({
            "is_expired": is_expired,
            "days_remaining": days_remaining,
            "installed_at": installed_at,
            "trial_days": trial_days,
            "server_time": now
        })

class SystemEnvironmentAPIView(APIView):
    def get(self, request):
        db_path = settings.DATABASES['default']['NAME']
        is_frozen = getattr(sys, 'frozen', False)
        return Response({
            "is_production": is_frozen,
            "database_path": str(db_path),
            "environment": "Electron Production" if is_frozen else "Local Development"
        })

class DatabaseResetAPIView(APIView):
    def post(self, request):
        try:
            from students.models import Student
            from payments.models import Receipt, StudentFeeMapping, FeeCategory
            from .models import Backup
            
            # Terminate all generated data from the bottom up to respect DB constraints
            Receipt.objects.all().delete()
            StudentFeeMapping.objects.all().delete()
            Student.objects.all().delete()
            Backup.objects.all().delete()
            FeeCategory.objects.all().delete()
            
            # Instantly re-establish the core system structure mappings to preserve application stability
            FeeCategory.objects.create(name='Tuition', description='Monthly tuition fee')
            FeeCategory.objects.create(name='Bus', description='School bus transportation fee')
            FeeCategory.objects.create(name='CCA', description='Co-curricular activities fee')
            FeeCategory.objects.create(name='Uniform', description='School uniform fee')
            
            return Response({"status": "Success", "message": "Database completely wiped and structurally re-seeded."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
