from rest_framework import serializers
from .models import SchoolSettings, Backup

class SchoolSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolSettings
        fields = '__all__'

class BackupSerializer(serializers.ModelSerializer):
    # Map to frontend field names for backward compatibility
    filename = serializers.CharField(source='file_name', read_only=True)
    size = serializers.IntegerField(source='file_size', read_only=True)
    
    class Meta:
        model = Backup
        fields = ['id', 'file_name', 'file_path', 'file_size', 'created_at', 'status', 'filename', 'size']
