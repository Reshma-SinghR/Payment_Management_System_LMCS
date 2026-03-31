from rest_framework.views import APIView
from payments.utils import clean_param
from collections import defaultdict
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F, Value, Case, When, IntegerField
from django.db.models.functions import TruncMonth, Concat
from django.utils import timezone
from datetime import date, timedelta
from students.models import Student
from payments.models import (
    Receipt, PaymentStatus, FeeCategory, 
    DailyCollection, MonthlyCollection, StudentFeeMapping,
    ReceiptItem
)

from payments.utils import MONTHS_ORDER, get_month_year, get_due_months, get_short_month_ranges

MONTH_MAP = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
}

class DashboardAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year', '2024-25'))
            simulation_date = clean_param(request.query_params.get('simulation_date'))
            
            # New filter parameters
            student_class = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            bus_id = clean_param(request.query_params.get('bus_id'))
            cca_id = clean_param(request.query_params.get('cca_activity_id'))
            search = clean_param(request.query_params.get('search'))
            if simulation_date:
                from datetime import datetime
                try:
                    today = datetime.strptime(simulation_date, '%Y-%m-%d').date()
                except Exception:
                    today = timezone.now().date()
            else:
                today = timezone.now().date()
                
            # Global student filter for active year
            students_qs = Student.objects.filter(status='Active', academic_year=academic_year)
            if student_class: students_qs = students_qs.filter(student_class=student_class)
            if division: students_qs = students_qs.filter(division=division)
            if bus_id: students_qs = students_qs.filter(bus_number_id=bus_id)
            if cca_id: students_qs = students_qs.filter(cca_activities__id=cca_id)
            if search:
                students_qs = students_qs.filter(Q(name__icontains=search) | Q(admission_no__icontains=search))
                
            total_students = students_qs.count()
            
            # Pull from real-time transaction records matching filtered students
            receipts_base = Receipt.objects.filter(academic_year=academic_year, student__in=students_qs)
            
            today_collection = receipts_base.filter(date=today).aggregate(total=Sum('total_amount'))['total'] or 0
            
            month_collection = receipts_base.filter(date__month=today.month, date__year=today.year).aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Academic year month order (April to March)
            # Determine starting month for filtering
            year_students = students_qs
            month_freq = year_students.values('starting_month').annotate(count=Count('starting_month')).order_by('-count')
            year_start_month = month_freq[0]['starting_month'] if month_freq.exists() else 'April'
            # 1. Determine cycle limits
            try:
                start_year_val = int(academic_year.split('-')[0])
            except (ValueError, IndexError):
                start_year_val = today.year
                
            start_month_num = MONTH_MAP.get(year_start_month, 4)
            ay_start_date = date(start_year_val, start_month_num, 1)

            # Centralized dynamically calculated pending stats
            total_owed = 0
            total_paid = 0
            pending_student_ids = set()
            
            # Group students by their starting month to minimize queries
            s_months = students_qs.values_list('starting_month', flat=True).distinct()
            from payments.utils import get_due_months
            for s_month in s_months:
                d_months = get_due_months(academic_year, s_month, simulation_date=simulation_date)
                if not d_months: continue
                
                qs = StudentFeeMapping.objects.filter(
                    student__status='Active',
                    student__starting_month=s_month,
                    academic_year=academic_year,
                    is_paid=False,
                    month__in=d_months,
                    amount__gt=F('paid_amount')
                )
                stats = qs.aggregate(t_owed=Sum('amount'), t_paid=Sum('paid_amount'))
                total_owed += stats['t_owed'] or 0
                total_paid += stats['t_paid'] or 0
                
                # Collect distinct student IDs
                p_ids = qs.values_list('student_id', flat=True).distinct()
                pending_student_ids.update(p_ids)

            pending_amount = total_owed - total_paid
            pending_student_count = len(pending_student_ids)
            
            today_receipt_count = Receipt.objects.filter(date=today, academic_year=academic_year).count()
            
            recent_transactions = Receipt.objects.filter(academic_year=academic_year).prefetch_related('items', 'items__fee_category').select_related('student').order_by('-id')[:5]
            recent_data = [{
                'receipt_no': r.receipt_no,
                'student_name': r.student.name,
                'amount': float(r.total_amount or 0),
                'date': r.date.isoformat(),
                'fee_type': r.items.first().fee_category.name if r.items.exists() else 'Multi'
            } for r in recent_transactions]
            
            # Monthly collection and pending chart data
            collection_qs = Receipt.objects.filter(
                academic_year=academic_year,
            ).values('date__month').annotate(
                total_collection=Sum('total_amount')
            )
            collection_map = {item['date__month']: float(item['total_collection'] or 0) for item in collection_qs}

            # Calculate pending per month efficiently
            pending_map = {}
            for s_month in s_months:
                d_months = get_due_months(academic_year, s_month, simulation_date=simulation_date)
                if not d_months: continue
                qs = StudentFeeMapping.objects.filter(
                    student__status='Active',
                    student__starting_month=s_month,
                    academic_year=academic_year,
                    is_paid=False,
                    month__in=d_months,
                    amount__gt=F('paid_amount')
                ).values('month').annotate(
                    total_pending=Sum(F('amount') - F('paid_amount'))
                )
                for item in qs:
                    m = item['month']
                    pending_map[m] = pending_map.get(m, 0.0) + float(item['total_pending'])

            chart_data = []
            for i in range(12):
                m_num = (start_month_num + i - 1) % 12 + 1
                month_names = [name for name, num in MONTH_MAP.items() if num == m_num]
                month_name = month_names[0] if month_names else 'Unknown'
                coll = collection_map.get(m_num, 0.0)
                month_year_label = get_month_year(month_name, academic_year, year_start_month)

                chart_data.append({
                    'name': month_year_label,
                    'short_name': month_name[:3],
                    'collection': float(coll),
                    'pending': float(pending_map.get(month_name, 0.0)),
                    'color': '#0066cc' if i % 2 == 0 else '#10b981'
                })
                
            year_collection = Receipt.objects.filter(academic_year=academic_year).aggregate(total=Sum('total_amount'))['total'] or 0
            
            return Response({
                'total_students': total_students,
                'today_collection': float(today_collection),
                'month_collection': float(month_collection),
                'year_collection': float(year_collection),
                'pending_amount': float(pending_amount),
                'pending_student_count': pending_student_count,
                'today_receipt_count': today_receipt_count,
                'recent_transactions': recent_data,
                'chart_data': chart_data
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'total_students': 0,
                'today_collection': 0.0,
                'month_collection': 0.0,
                'year_collection': 0.0,
                'pending_amount': 0.0,
                'pending_student_count': 0,
                'today_receipt_count': 0,
                'recent_transactions': [],
                'chart_data': [],
                'error': str(e)
            }, status=200)

class DateWiseCollectionAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year'))
            start_date = clean_param(request.query_params.get('start_date'))
            end_date = clean_param(request.query_params.get('end_date'))
            student_class = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            fee_type = clean_param(request.query_params.get('fee_type'))
            search = clean_param(request.query_params.get('search'))
            
            receipts = Receipt.objects.filter(is_deleted=False)
            
            if academic_year:
                receipts = receipts.filter(academic_year=academic_year)
            if start_date:
                receipts = receipts.filter(date__gte=start_date)
            if end_date:
                receipts = receipts.filter(date__lte=end_date)
            if student_class:
                receipts = receipts.filter(student__student_class=student_class)
            if division:
                receipts = receipts.filter(student__division=division)
            if fee_type:
                receipts = receipts.filter(items__fee_category_id=fee_type)
            if search:
                receipts = receipts.filter(
                    Q(student__name__icontains=search) | 
                    Q(student__admission_no__icontains=search) |
                    Q(receipt_no__icontains=search)
                )

            receipt_data = []
            for r in receipts.select_related('student','payment_status').prefetch_related('items__fee_category').order_by('-date', '-id'):
                # Extract fee type (first one)
                f_type = r.items.first().fee_category.name if r.items.exists() else 'N/A'
                receipt_data.append({
                    'id': r.id,
                    'receipt_no': r.receipt_no,
                    'date': r.date.isoformat(),
                    'student_name': r.student.name,
                    'class': r.student.student_class,
                    'division': r.student.division,
                    'fee_type': f_type,
                    'amount': float(r.total_amount or 0),
                    'status': r.payment_status.name if r.payment_status else 'Paid'
                })
            
            total_amount = receipts.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            return Response({
                'receipts': receipt_data,
                'total_amount': float(total_amount)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'receipts': [], 'total_amount': 0.0, 'error': str(e)}, status=200)

class FeeTypeReportAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year'))
            start_date = clean_param(request.query_params.get('start_date'))
            end_date = clean_param(request.query_params.get('end_date'))
            student_class = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            bus_id = clean_param(request.query_params.get('bus_id'))
            cca_id = clean_param(request.query_params.get('cca_activity_id'))
            search = clean_param(request.query_params.get('search'))

            # 1. Summary Cards Logic
            summary_qs = ReceiptItem.objects.filter(receipt__is_deleted=False)
            if academic_year: summary_qs = summary_qs.filter(receipt__academic_year=academic_year)
            if start_date: summary_qs = summary_qs.filter(receipt__date__gte=start_date)
            if end_date: summary_qs = summary_qs.filter(receipt__date__lte=end_date)
            if student_class: summary_qs = summary_qs.filter(receipt__student__student_class=student_class)
            if division: summary_qs = summary_qs.filter(receipt__student__division=division)
            if bus_id: summary_qs = summary_qs.filter(receipt__student__bus_number_id=bus_id)
            if cca_id: summary_qs = summary_qs.filter(receipt__student__cca_activities__id=cca_id)
            if search:
                summary_qs = summary_qs.filter(
                    Q(receipt__student__name__icontains=search) | 
                    Q(receipt__student__admission_no__icontains=search)
                )

            summary = summary_qs.values('fee_category__name').annotate(
                total_amount=Sum('amount'),
                total_students=Count('receipt__student', distinct=True)
            ).order_by('-total_amount')

            summary_data = [{
                'fee_type': item['fee_category__name'],
                'total_amount': float(item['total_amount'] or 0),
                'total_students': item['total_students']
            } for item in summary]

            # 2. Detailed Student List Logic (Optimization: Limit to first 1000 for performance)
            # Fetch students matching filters
            students = Student.objects.filter(status='Active')
            if academic_year: students = students.filter(academic_year=academic_year)
            if student_class: students = students.filter(student_class=student_class)
            if division: students = students.filter(division=division)
            if bus_id: students = students.filter(bus_number_id=bus_id)
            if cca_id: students = students.filter(cca_activities__id=cca_id)
            if search:
                students = students.filter(Q(name__icontains=search) | Q(admission_no__icontains=search))

            total_matching = students.count()
            students = students.only('id', 'name', 'admission_no', 'student_class', 'division').order_by('name')[:1000]

            student_ids = [s.id for s in students]

            # Fetch relevant fee mappings for these students
            mappings = StudentFeeMapping.objects.filter(
                student_id__in=student_ids,
                academic_year=academic_year or '2024-25'
            ).select_related('fee_category')

            # Fetch payments (receipt items) for these students and time range
            receipt_items = ReceiptItem.objects.filter(
                receipt__is_deleted=False,
                receipt__student_id__in=student_ids,
                receipt__academic_year=academic_year or '2024-25'
            ).select_related('fee_category', 'receipt')

            # Group mappings by student
            student_fee_map = {}
            for m in mappings:
                sid = m.student_id
                if sid not in student_fee_map: student_fee_map[sid] = {}
                cat_name = m.fee_category.name
                if cat_name not in student_fee_map[sid]:
                    student_fee_map[sid][cat_name] = {'owed': 0.0, 'paid': 0.0}
                student_fee_map[sid][cat_name]['owed'] += float(m.amount or 0)

            # Group payments by student
            for ri in receipt_items:
                sid = ri.receipt.student_id
                cat_name = ri.fee_category.name
                if sid in student_fee_map and cat_name in student_fee_map[sid]:
                    student_fee_map[sid][cat_name]['paid'] += float(ri.amount or 0)

            student_list_data = []
            for s in students:
                fees = student_fee_map.get(s.id, {})
                categories = []
                total_owed = 0.0
                total_paid = 0.0
                
                for cat_name, vals in fees.items():
                    owed = vals['owed']
                    paid = vals['paid']
                    status = 'Paid' if paid >= owed and owed > 0 else 'Partial' if paid > 0 else 'Unpaid'
                    categories.append({
                        'name': cat_name,
                        'owed': owed,
                        'paid': paid,
                        'status': status
                    })
                    total_owed += owed
                    total_paid += paid

                bal = total_owed - total_paid
                overall_status = 'Paid' if bal <= 0 and total_owed > 0 else 'Partial' if total_paid > 0 else 'Unpaid'
                
                student_list_data.append({
                    'name': s.name,
                    'admission_no': s.admission_no,
                    'class': f"{s.student_class}-{s.division}",
                    'categories': categories,
                    'total_owed': total_owed,
                    'total_paid': total_paid,
                    'total_balance': bal,
                    'status': overall_status
                })

            return Response({
                'summary': summary_data,
                'students': student_list_data,
                'total_matching_students': total_matching,
                'has_more': total_matching > 1000
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'summary': [],
                'students': [],
                'total_matching_students': 0,
                'has_more': False,
                'error': str(e)
            }, status=200)

class StudentWiseReportAPIView(APIView):
    def get(self, request):
        try:
            student_id = clean_param(request.query_params.get('student_id'))
            search = clean_param(request.query_params.get('search'))
            
            if student_id:
                try:
                    student = Student.objects.prefetch_related('cca_activities').get(id=student_id)
                except Student.DoesNotExist:
                    return Response({'error': 'Student not found'}, status=404)
            elif search:
                try:
                    student = Student.objects.prefetch_related('cca_activities').filter(
                        Q(name__icontains=search) | Q(admission_no__icontains=search)
                    ).annotate(
                        exact_match=Case(
                            When(name__iexact=search, then=Value(0)),
                            When(admission_no__iexact=search, then=Value(0)),
                            When(name__istartswith=search, then=Value(1)),
                            When(admission_no__istartswith=search, then=Value(1)),
                            default=Value(2),
                            output_field=IntegerField()
                        )
                    ).order_by('exact_match', 'name').first()
                    if not student:
                        return Response({'error': 'Student not found'}, status=404)
                except Exception:
                    return Response({'error': 'Search error'}, status=400)
            else:
                return Response({'error': 'Student ID or Search term required'}, status=400)
                
            academic_year = clean_param(request.query_params.get('academic_year', '2024-25'))
            
            # 1. Fetch all fee mappings for the student in this academic year
            mappings = StudentFeeMapping.objects.filter(
                student=student,
                academic_year=academic_year
            ).select_related('fee_category').order_by('month')

            # 2. Get the official due months for this student
            due_months = get_due_months(academic_year, student.starting_month, student.starting_year)
            
            # 3. Structure data by month
            start_month_num = MONTH_MAP.get(student.starting_month, 4)
            def month_sort_key(m_name):
                m_num = MONTH_MAP.get(m_name, 1)
                return (m_num - start_month_num) % 12

            # Group mappings by month
            monthly_data = {}
            all_months = set(due_months)
            for m in mappings:
                all_months.add(m.month)
                if m.month not in monthly_data:
                    monthly_data[m.month] = {
                        'month_name': m.month,
                        'display_month': get_month_year(m.month, academic_year, student.starting_month),
                        'is_due': m.month in due_months,
                        'fees': [],
                        'total_owed': 0,
                        'total_paid': 0,
                        'balance': 0
                    }
                
                fee_info = {
                    'category': m.fee_category.name,
                    'owed': float(m.amount),
                    'paid': float(m.paid_amount),
                    'balance': float(m.amount - m.paid_amount),
                    'is_paid': m.is_paid
                }
                monthly_data[m.month]['fees'].append(fee_info)
                monthly_data[m.month]['total_owed'] += fee_info['owed']
                monthly_data[m.month]['total_paid'] += fee_info['paid']
                monthly_data[m.month]['balance'] += fee_info['balance']

            # Sort months circularlly
            sorted_months = sorted(list(all_months), key=month_sort_key)
            final_monthly_breakdown = []
            for m_name in sorted_months:
                if m_name in monthly_data:
                    final_monthly_breakdown.append(monthly_data[m_name])
                else:
                    # Month exists in due_months but no mappings found (should not happen normally)
                    final_monthly_breakdown.append({
                        'month_name': m_name,
                        'display_month': get_month_year(m_name, academic_year, student.starting_month),
                        'is_due': True,
                        'fees': [],
                        'total_owed': 0,
                        'total_paid': 0,
                        'balance': 0
                    })

            # 4. Payment History (Receipts)
            receipt_filter = Q(student=student)
            if academic_year:
                receipt_filter &= Q(academic_year=academic_year)
            receipts = Receipt.objects.filter(receipt_filter).prefetch_related('items', 'items__fee_category').select_related('payment_status').order_by('-date', '-id')
            
            history = [{
                'receipt_no': r.receipt_no,
                'date': r.date.isoformat(),
                'fee_type': r.items.first().fee_category.name if r.items.exists() else 'N/A',
                'amount': float(r.total_amount),
                'month': get_month_year(r.items.first().month, academic_year, student.starting_month) if r.items.exists() else 'N/A',
                'status': r.payment_status.name if r.payment_status else 'N/A',
            } for r in receipts]

            # 5. Summary Totals
            annual_owed = sum(m['total_owed'] for m in final_monthly_breakdown)
            annual_paid = sum(m['total_paid'] for m in final_monthly_breakdown)
            current_balance = sum(m['balance'] for m in final_monthly_breakdown if m['is_due'])

            return Response({
                'student_name': student.name,
                'admission_no': student.admission_no,
                'class': student.student_class,
                'division': student.division,
                'phone_number': student.phone_number,
                'bus_number': student.bus_number.bus_number if student.bus_number else None,
                'bus_stop': student.bus_stop,
                'bus_fee_monthly': float(student.bus_fee),
                'tuition_fee_monthly': float(student.tuition_fee),
                'cca_fee_monthly': float(student.cca_fee),
                'cca_activities': [cca.name for cca in student.cca_activities.all()],
                'annual_summary': {
                    'total_owed': annual_owed,
                    'total_paid': annual_paid,
                    'total_balance': annual_owed - annual_paid,
                    'due_balance': current_balance
                },
                'monthly_breakdown': final_monthly_breakdown,
                'history': history,
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=200)

class ClassWiseReportAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year'))
            student_class = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            bus_id = clean_param(request.query_params.get('bus_id'))
            cca_id = clean_param(request.query_params.get('cca_activity_id'))
            search = clean_param(request.query_params.get('search'))
            
            # Start with a safe Year filter
            if not academic_year:
                from students.models import AcademicYear
                ay = AcademicYear.objects.filter(is_active=True).first()
                academic_year = ay.name if ay else '2024-25'

            students_qs = Student.objects.filter(academic_year=academic_year)
            if student_class:
                students_qs = students_qs.filter(student_class=student_class)
            if division:
                students_qs = students_qs.filter(division=division)
            if bus_id:
                students_qs = students_qs.filter(bus_number_id=bus_id)
            if cca_id:
                students_qs = students_qs.filter(cca_activities__id=cca_id)
            if search:
                students_qs = students_qs.filter(
                    Q(name__icontains=search) | Q(admission_no__icontains=search)
                )

            # Performance: Group by Class-Division
            grouped = students_qs.values('student_class', 'division').annotate(
                total_students=Count('id')
            ).order_by('student_class', 'division')

            # Dynamic pending logic matching Dashboard
            from payments.utils import get_due_months
            # Fetch all active student info needed
            # We must consider ALL students in the filtered queryset, not just 'Active' 
            # (though reports usually focus on Active, the request says "all classes listing in the academic year")
            active_students = students_qs.filter(status='Active').values('id', 'student_class', 'division', 'starting_month')
            student_info_map = {s['id']: s for s in active_students}
            active_ids = list(student_info_map.keys())

            # Batch fetch collections for selected year and students
            receipts = Receipt.objects.filter(
                academic_year=academic_year,
                student_id__in=active_ids,
                is_deleted=False
            ).values('student_id').annotate(total=Sum('total_amount'))
            collection_map = {r['student_id']: float(r['total'] or 0) for r in receipts}

            # Batch fetch Mappings for pending logic
            mappings = StudentFeeMapping.objects.filter(
                academic_year=academic_year,
                student_id__in=active_ids
            ).values('student_id', 'month', 'amount', 'paid_amount', 'student__starting_month')

            # Calculate pending per student efficiently
            student_pending_ids = set()
            # Cache due months per starting month
            due_months_cache = {}

            for m in mappings:
                sid = m['student_id']
                s_month = m['student__starting_month']
                if s_month not in due_months_cache:
                    due_months_cache[s_month] = get_due_months(academic_year, s_month)
                
                if m['month'] in due_months_cache[s_month]:
                    pending = float(m['amount'] or 0) - float(m['paid_amount'] or 0)
                    if pending > 0:
                        student_pending_ids.add(sid)

            # Finalize groups
            results = []
            
            # For the "Filtered Student List" in frontend (data[0].student_details)
            filtered_student_list = []
            if bus_id or cca_id or search:
                detail_students = students_qs.select_related('bus_number').only(
                    'admission_no', 'name', 'student_class', 'division', 'bus_number__bus_number', 'status'
                ).order_by('student_class', 'division', 'name')
                filtered_student_list = [{
                    'admission_no': s.admission_no,
                    'name': s.name,
                    'student_class': s.student_class,
                    'division': s.division,
                    'bus_number': s.bus_number.bus_number if s.bus_number else 'N/A',
                    'status': s.status
                } for s in detail_students]

            for g in grouped:
                c_name = g['student_class']
                d_name = g['division']
                
                # Filter relevant students in this cluster
                c_ids = [sid for sid, info in student_info_map.items() 
                        if info['student_class'] == c_name and info['division'] == d_name]
                
                cls_collection = sum(collection_map.get(sid, 0.0) for sid in c_ids)
                cls_unpaid_count = sum(1 for sid in c_ids if sid in student_pending_ids)
                cls_paid_count = len(c_ids) - cls_unpaid_count

                item = {
                    'class': f"{c_name}-{d_name}",
                    'total_students': g['total_students'],
                    'paid_count': cls_paid_count,
                    'unpaid_count': cls_unpaid_count,
                    'total_paid': cls_collection
                }
                
                # Add student_details to the first item if we have them
                if not results and filtered_student_list:
                    item['student_details'] = filtered_student_list
                
                results.append(item)

            return Response(results)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response([], status=200)

class MonthlySummaryAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year'))
            start_date = clean_param(request.query_params.get('start_date'))
            end_date = clean_param(request.query_params.get('end_date'))
            student_class = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            fee_type = clean_param(request.query_params.get('fee_type'))
            bus_id = clean_param(request.query_params.get('bus_id'))
            cca_id = clean_param(request.query_params.get('cca_activity_id'))
            search = clean_param(request.query_params.get('search'))
            
            if not academic_year:
                from students.models import AcademicYear
                active_year = AcademicYear.objects.filter(is_active=True).first()
                academic_year = active_year.name if active_year else '2024-25'
                
            receipts = Receipt.objects.filter(
                is_deleted=False,
                academic_year=academic_year
            ).exclude(payment_status__name='Unpaid')

            if start_date:
                receipts = receipts.filter(date__gte=start_date)
            if end_date:
                receipts = receipts.filter(date__lte=end_date)
            
            if student_class:
                receipts = receipts.filter(student__student_class=student_class)
            if division:
                receipts = receipts.filter(student__division=division)
            if fee_type:
                receipts = receipts.filter(items__fee_category_id=fee_type)
            if bus_id:
                receipts = receipts.filter(student__bus_number_id=bus_id)
            if cca_id:
                receipts = receipts.filter(student__cca_activities__id=cca_id)
            if search:
                receipts = receipts.filter(
                    Q(student__name__icontains=search) | 
                    Q(student__admission_no__icontains=search)
                )

            # Determine starting month for filtering
            year_students = Student.objects.filter(academic_year=academic_year)
            month_freq = year_students.values('starting_month').annotate(count=Count('starting_month')).order_by('-count')
            year_start_month = month_freq[0]['starting_month'] if month_freq.exists() else 'April'

            start_month_num = MONTH_MAP.get(year_start_month, 4)
            
            report = receipts.values('date__month').annotate(
                total_collection=Sum('total_amount')
            ).order_by('date__month')
            
            collection_by_month_idx = {item['date__month']: float(item['total_collection'] or 0) for item in report}
            
            # Use filters for pending too
            pending_qs = StudentFeeMapping.objects.filter(
                academic_year=academic_year,
                is_paid=False,
                amount__gt=F('paid_amount')
            )
            if student_class: pending_qs = pending_qs.filter(student__student_class=student_class)
            if division: pending_qs = pending_qs.filter(student__division=division)
            if fee_type: pending_qs = pending_qs.filter(fee_category_id=fee_type)
            
            pending_report = pending_qs.values('month').annotate(
                total_pending=Sum(F('amount') - F('paid_amount'))
            )
            pending_map = {item['month']: float(item['total_pending']) for item in pending_report}

            data = []
            for i in range(12):
                m_num = (start_month_num + i - 1) % 12 + 1
                month_names = [name for name, num in MONTH_MAP.items() if num == m_num]
                month_name = month_names[0] if month_names else 'Unknown'
                
                data.append({
                    'month': get_month_year(month_name, academic_year, year_start_month),
                    'total_collection': collection_by_month_idx.get(m_num, 0.0),
                    'total_pending': float(pending_map.get(month_name, 0.0))
                })
                
            return Response(data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response([], status=200)

class PendingReportAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year'))
            class_name = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            bus_id = clean_param(request.query_params.get('bus_id'))
            cca_id = clean_param(request.query_params.get('cca_activity_id'))
            fee_type = clean_param(request.query_params.get('fee_type'))
            search = clean_param(request.query_params.get('search'))
            simulation_date = clean_param(request.query_params.get('simulation_date'))
            start_date_filter = clean_param(request.query_params.get('start_date'))
            end_date_filter = clean_param(request.query_params.get('end_date'))

            if not academic_year:
                from students.models import AcademicYear
                ay = AcademicYear.objects.filter(is_active=True).first()
                academic_year = ay.name if ay else '2024-25'

            # Base student filter
            students_qs = Student.objects.filter(status='Active', academic_year=academic_year)
            if class_name: students_qs = students_qs.filter(student_class=class_name)
            if division: students_qs = students_qs.filter(division=division)
            if bus_id: students_qs = students_qs.filter(bus_number_id=bus_id)
            if cca_id: students_qs = students_qs.filter(cca_activities__id=cca_id)
            if search:
                students_qs = students_qs.filter(Q(name__icontains=search) | Q(admission_no__icontains=search))

            from payments.utils import get_due_months
            
            if not class_name:
                # Grouped mode: summary per class
                s_months = students_qs.values_list('starting_month', flat=True).distinct()
                unpaid_counts = {}
                
                for s_month in s_months:
                    d_months = get_due_months(academic_year, s_month, simulation_date=simulation_date, 
                                            start_date_filter=start_date_filter, end_date_filter=end_date_filter)
                    if not d_months: continue
                    
                    qs = StudentFeeMapping.objects.filter(
                        academic_year=academic_year,
                        month__in=d_months,
                        is_paid=False,
                        amount__gt=F('paid_amount'),
                        student__in=students_qs
                    )
                    if fee_type: qs = qs.filter(fee_category_id=fee_type)
                    
                    class_stats = qs.values('student__student_class').annotate(u_count=Count('student', distinct=True))
                    for item in class_stats:
                        c = item['student__student_class']
                        if c:
                            unpaid_counts[c] = unpaid_counts.get(c, 0) + item['u_count']
                            
                data = [{'class': k, 'unpaid_count': v} for k, v in unpaid_counts.items()]
                import re
                data.sort(key=lambda x: int(re.sub(r'\D', '', x['class'])) if re.sub(r'\D', '', x['class']) else 0)
                return Response(data)
            else:
                # Detail mode: list of students in class
                results = []
                # Fetch all filtered students in this class
                for s in students_qs:
                    d_months = get_due_months(academic_year, s.starting_month, simulation_date=simulation_date,
                                            start_date_filter=start_date_filter, end_date_filter=end_date_filter)
                    if not d_months: continue
                    
                    pending_qs = StudentFeeMapping.objects.filter(
                        student=s,
                        academic_year=academic_year,
                        month__in=d_months,
                        is_paid=False,
                        amount__gt=F('paid_amount')
                    )
                    if fee_type: pending_qs = pending_qs.filter(fee_category_id=fee_type)
                    
                    pending_amount = pending_qs.aggregate(total=Sum(F('amount') - F('paid_amount')))['total'] or 0
                    
                    if pending_amount > 0:
                        m_names = list(pending_qs.values_list('month', flat=True).distinct())
                        # Sort month names
                        start_month_num = MONTH_MAP.get(s.starting_month, 4)
                        def m_sort(mn): return (MONTH_MAP.get(mn, 1) - start_month_num) % 12
                        m_names.sort(key=m_sort)
                        
                        from payments.utils import get_short_month_ranges
                        formatted_months = [get_month_year(m, academic_year, s.starting_month) for m in m_names]
                        months_display = get_short_month_ranges(formatted_months, academic_year, s.starting_month)

                        results.append({
                            'student_id': s.id,
                            'student_name': s.name,
                            'admission_no': s.admission_no,
                            'pending_amount': float(pending_amount),
                            'pending_months_display': months_display,
                            'mapping_ids': list(pending_qs.values_list('id', flat=True))
                        })
                
                results.sort(key=lambda x: x['student_name'])
                return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class StudentListReportAPIView(APIView):
    def get(self, request):
        try:
            academic_year = clean_param(request.query_params.get('academic_year', '2024-25'))
            student_class = clean_param(request.query_params.get('student_class')) or clean_param(request.query_params.get('class'))
            division = clean_param(request.query_params.get('division'))
            bus_id = clean_param(request.query_params.get('bus_id'))
            cca_id = clean_param(request.query_params.get('cca_activity_id'))
            search = clean_param(request.query_params.get('search'))
            
            s_filter = Q(status="Active", academic_year=academic_year)
            if student_class: s_filter &= Q(student_class=student_class)
            if division: s_filter &= Q(division=division)
            if bus_id: s_filter &= Q(bus_number_id=bus_id)
            if cca_id: s_filter &= Q(cca_activities__id=cca_id)
            if search:
                s_filter &= (Q(name__icontains=search) | Q(admission_no__icontains=search))

            students = Student.objects.filter(s_filter).prefetch_related('bus_number').order_by('student_class', 'name')
            
            # Get financials in one go
            mappings = StudentFeeMapping.objects.filter(
                academic_year=academic_year,
                student__in=students
            ).values('student_id').annotate(
                total_owed=Sum('amount'),
                total_paid=Sum('paid_amount')
            )
            fin_map = {m['student_id']: m for m in mappings}

            data = []
            for s in students[:1000]: # Limit for performance
                fin = fin_map.get(s.id, {'total_owed': 0, 'total_paid': 0})
                owed = float(fin['total_owed'] or 0)
                paid = float(fin['total_paid'] or 0)
                bal = owed - paid
                
                if owed == 0: status = 'Paid'
                elif paid == 0: status = 'Unpaid'
                elif paid < owed: status = 'Partial'
                else: status = 'Paid'

                data.append({
                    'id': s.id,
                    'admission_no': s.admission_no,
                    'name': s.name,
                    'class': s.student_class,
                    'division': s.division,
                    'bus_route': f"{s.bus_number.bus_number} ({s.bus_stop})" if s.bus_number else 'No Bus',
                    'status': status,
                    'total_owed': owed,
                    'total_paid': paid,
                    'balance': bal
                })
            return Response(data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=200 if request.query_params.get('class_name') else 200) # Always return 200 for reports to avoid UI crash
