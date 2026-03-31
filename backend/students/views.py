from payments.utils import clean_param
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response as DRFResponse
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from .models import Student, AcademicYear, SchoolClass, StudentAcademicRecord, Bus
from .serializers import StudentSerializer, AcademicYearSerializer, SchoolClassSerializer, BusSerializer

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all().order_by('-start_year')
    serializer_class = AcademicYearSerializer

class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all().order_by('name')
    serializer_class = SchoolClassSerializer

class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.all().order_by('bus_number')
    serializer_class = BusSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['academic_year', 'academic_year__name']
    search_fields = ['bus_number']

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('-id')
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student_class', 'status', 'academic_year', 'bus_number']
    search_fields = ['name', 'admission_no', 'phone_number', 'bus_number__bus_number', 'bus_fee', 'tuition_fee', 'division']
    ordering_fields = ['name', 'admission_no', 'bus_number__bus_number', 'bus_fee', 'tuition_fee']

    def filter_queryset(self, queryset):
        # 1. Base filter backend applications
        filtered_qs = super().filter_queryset(queryset)
        query_params = self.request.query_params

        # 2. Fallback logic for academic_year if it returns empty but we have students
        req_year = clean_param(query_params.get('academic_year'))
        if req_year and not filtered_qs.exists() and queryset.exists():
            # Find the most recent academic year that actually has students
            latest_year = queryset.order_by('-id').values_list('academic_year', flat=True).first()
            if latest_year:
                # Rebuild base queryset for this latest year
                fallback_qs = queryset.filter(academic_year=latest_year)
                
                # Re-apply other filterset fields manually to preserve them
                student_class = clean_param(query_params.get('student_class'))
                if student_class:
                    fallback_qs = fallback_qs.filter(student_class=student_class)
                status = clean_param(query_params.get('status'))
                if status:
                    fallback_qs = fallback_qs.filter(status=status)
                bus_number = clean_param(query_params.get('bus_number'))
                if bus_number:
                    fallback_qs = fallback_qs.filter(bus_number=bus_number)
                
                filtered_qs = fallback_qs

        # 3. Apply custom search on top of the final filtered_qs
        search_param = query_params.get('search', '')
        search = clean_param(search_param).strip() if clean_param(search_param) else ''
        if search:
            from django.db.models import Case, When, Value, IntegerField
            filtered_qs = filtered_qs.annotate(
                exact_match=Case(
                    When(name__iexact=search, then=Value(0)),
                    When(admission_no__iexact=search, then=Value(0)),
                    When(name__istartswith=search, then=Value(1)),
                    When(admission_no__istartswith=search, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField()
                )
            ).order_by('exact_match', 'name')
            
        return filtered_qs

    @action(detail=False, methods=['post'])
    def promote(self, request):
        student_ids = request.data.get('student_ids', [])
        target_year_name = request.data.get('target_year') 
        from_year_name = request.data.get('from_year')
        starting_month = request.data.get('starting_month', 'April')
        starting_year = request.data.get('starting_year')
        keep_fees = request.data.get('keep_fees', False)
        
        if not student_ids or not target_year_name:
            return DRFResponse({"error": "student_ids and target_year are required"}, status=400)
        
        try:
            with transaction.atomic():
                target_year_obj = AcademicYear.objects.get(name=target_year_name)
                
                # Validation: Target year must be > from year if provided
                if from_year_name:
                    from_year_obj = AcademicYear.objects.get(name=from_year_name)
                    if target_year_obj.start_year <= from_year_obj.start_year:
                        return DRFResponse({"error": "Target year must be greater than source year"}, status=400)

                students = Student.objects.filter(id__in=student_ids)
                promoted_count = 0
                errors = []

                for student in students:
                    # Check if already exists in target year
                    if Student.objects.filter(admission_no=student.admission_no, academic_year=target_year_name).exists():
                        errors.append(f"Student {student.admission_no} already exists for {target_year_name}")
                        continue
                    
                    # Determine new class
                    try:
                        import re
                        current_class_str = student.student_class
                        match = re.search(r'\d+', current_class_str)
                        if match:
                            num = int(match.group())
                            new_class_str = current_class_str.replace(str(num), str(num + 1))
                        else:
                            new_class_str = current_class_str
                    except:
                        new_class_str = student.student_class

                    # Find matching bus in target year if needed
                    new_bus = None
                    if student.bus_number:
                        try:
                            new_bus = Bus.objects.get(bus_number=student.bus_number.bus_number, academic_year=target_year_obj)
                        except Bus.DoesNotExist:
                            # If matching bus doesn't exist, we might want to create it or leave as None
                            # Seeding is usually done on AY creation, but just in case
                            new_bus = None

                    # Create new student record for the new year
                    new_student = Student.objects.create(
                        admission_no=student.admission_no,
                        name=student.name,
                        student_class=new_class_str,
                        division=student.division,
                        phone_number=student.phone_number,
                        bus_number=new_bus,
                        bus_stop=student.bus_stop,
                        bus_fee=student.bus_fee if keep_fees else 0,
                        tuition_fee=student.tuition_fee if keep_fees else 0,
                        status='Active',
                        starting_month=starting_month,
                        starting_year=starting_year or target_year_obj.start_year,
                        academic_year=target_year_name,
                        is_special_case=student.is_special_case,
                        special_case_details=student.special_case_details
                    )
                    
                    # Also create StudentAcademicRecord for linkage
                    # Check for SchoolClass object
                    s_class, _ = SchoolClass.objects.get_or_create(name=new_class_str)
                    
                    StudentAcademicRecord.objects.create(
                        student=new_student,
                        academic_year=target_year_obj,
                        student_class=s_class,
                        division=new_student.division,
                        class_fee_start_date=target_year_obj.start_date,
                        tuition_fee=new_student.tuition_fee,
                        bus_fee=new_student.bus_fee,
                        cca_fee=0,
                        status='Active'
                    )
                    
                    promoted_count += 1
                    
                return DRFResponse({
                    "message": f"Successfully promoted {promoted_count} students",
                    "errors": errors
                })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return DRFResponse({"error": str(e)}, status=400)
