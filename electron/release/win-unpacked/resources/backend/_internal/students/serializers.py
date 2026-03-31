from rest_framework import serializers
from rest_framework.validators import UniqueValidator, UniqueTogetherValidator

from django.db.models import Sum
from .models import Student, AcademicYear, SchoolClass, StudentAcademicRecord, Bus

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'

    def validate_name(self, value):
        if AcademicYear.objects.filter(name=value).exists():
            # Check if we are updating an existing record
            if self.instance and self.instance.name == value:
                return value
            raise serializers.ValidationError("Academic year with this name already exists.")
        return value



class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = '__all__'

class BusSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = Bus
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    pending_balance = serializers.SerializerMethodField()
    bus_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    tuition_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    cca_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    division = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    academic_year = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Student
        fields = '__all__'
        validators = [
            UniqueTogetherValidator(
                queryset=Student.objects.all(),
                fields=['admission_no', 'academic_year'],
                message="This admission number is already in use for the selected academic year."
            )
        ]
    
    def validate_bus_fee(self, value):
        if value in [None, '']: return 0.00
        return value

    def validate_tuition_fee(self, value):
        if value in [None, '']: return 0.00
        return value

    def validate_cca_fee(self, value):
        if value in [None, '']: return 0.00
        return value

    def validate_phone_number(self, value):
        if value is None: return ''
        return value

    def validate_division(self, value):
        if value is None: return ''
        return value

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.bus_number:
            representation['bus_number_details'] = {
                'id': instance.bus_number.id,
                'bus_number': instance.bus_number.bus_number,
                'monthly_fee': float(instance.bus_number.monthly_fee)
            }
        return representation

    def get_pending_balance(self, obj):
        from payments.models import StudentFeeMapping
        return obj.fee_mappings.filter(is_paid=False).aggregate(Sum('amount'))['amount__sum'] or 0

class StudentAcademicRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAcademicRecord
        fields = '__all__'
