from datetime import date, datetime
from django.utils import timezone
import calendar

MONTHS_ORDER = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"]
MONTH_MAP = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
}

def clean_param(val):
    if val in [None, '', 'null', 'undefined', 'All', 'all', 'None']:
        return None
    return str(val).strip()

def get_academic_years(academic_year_str):
    """
    Extracts start and end year integers from an academic year string (e.g., '2026-27').
    """
    try:
        start_year = int(str(academic_year_str).split('-')[0])
    except (ValueError, IndexError, AttributeError):
        start_year = timezone.now().year
    end_year = start_year + 1
    return start_year, end_year

def get_month_date_range(month_name, academic_year_str):
    """
    Converts a month name and academic year into an absolute date range.
    April-Dec -> Year 1
    Jan-Mar -> Year 2
    """
    start_year, end_year = get_academic_years(academic_year_str)
    m_num = MONTH_MAP.get(month_name)
    if not m_num:
        return None, None
        
    year = start_year if m_num >= 4 else end_year
    _, last_day = calendar.monthrange(year, m_num)
    return date(year, m_num, 1), date(year, m_num, last_day)

def get_due_months(academic_year, start_month, start_year_override=None, simulation_date=None, start_date_filter=None, end_date_filter=None):
    """
    Returns a list of months from the start_month up to the current month, 
    strictly bounded by the 12-month academic cycle.
    """
    start_year, end_year = get_academic_years(academic_year)
    
    # Parse dates
    today = timezone.now().date()
    if simulation_date:
        try:
            today = datetime.strptime(str(simulation_date), '%Y-%m-%d').date()
        except:
            pass

    s_filter = None
    e_filter = None
    if start_date_filter:
        try:
            s_filter = datetime.strptime(str(start_date_filter), '%Y-%m-%d').date()
        except: pass
    if end_date_filter:
        try:
            e_filter = datetime.strptime(str(end_date_filter), '%Y-%m-%d').date()
        except: pass

    # Get student start date
    student_start_date, _ = get_month_date_range(start_month, academic_year)
    if not student_start_date:
        # Fallback to April if not found
        student_start_date = date(start_year, 4, 1)

    result_months = []
    
    # Evaluate all 12 months of the academic cycle logically (April to March)
    
    # If the simulation date (today) is past the end of the academic year entirely, 
    # we should max out the limit at the end of the academic year, not today.
    # Otherwise past academic years will show 0 pending fees when they are completely pending.
    _, ay_end_date = get_month_date_range('March', academic_year)
    if not ay_end_date:
        ay_end_date = date(end_year, 3, 31)
        
    for month_name in MONTHS_ORDER:
        m_start, m_end = get_month_date_range(month_name, academic_year)
        if not m_start: continue
        
        # Condition 1: Fee month must be >= Student Joining Month
        if m_start < student_start_date:
            continue
            
        # Condition 2: Allow advance payments for the entire academic year.
        # Previously, this locked out future months (`limit_date`), which broke 
        # the UI if a student was enrolled in an upcoming academic year (like 2026-27).
        # We now expose all valid mapped months for the cycle.
        # limit_date = min(today, ay_end_date)
        # if m_start > limit_date:
        #     continue
            
        # Condition 3: Optional Date Filters from UI
        if s_filter and m_end < s_filter:
            continue
        if e_filter and m_start > e_filter:
            continue
            
        result_months.append(month_name)
        
    return result_months

def get_student_due_months(student, academic_year, simulation_date=None):
    return get_due_months(academic_year, student.starting_month, simulation_date=simulation_date)

def ensure_student_fee_mappings(student, academic_year_name):
    """
    Ensures that a student has all necessary fee mappings for a given academic year.
    Generates missing ones if they don't exist, and updates amounts for unpaid ones if they differ.
    """
    try:
        from payments.models import StudentFeeMapping, FeeCategory
        
        # Get or create mandatory categories
        tuition_cat, _ = FeeCategory.objects.get_or_create(name='Tuition')
        bus_cat, _ = FeeCategory.objects.get_or_create(name='Bus')
        cca_cat, _ = FeeCategory.objects.get_or_create(name='CCA')
        
        # Determine enrollment start month
        start_month = student.starting_month or 'April'
        try:
            start_idx = MONTHS_ORDER.index(start_month)
        except ValueError:
            start_idx = 0 # Fallback to April
            
        valid_months = MONTHS_ORDER[start_idx:]
        invalid_months = [m for m in MONTHS_ORDER if m not in valid_months]
        
        # 1. Cleanup mappings for invalid months (only if unpaid)
        StudentFeeMapping.objects.filter(
            student=student,
            month__in=invalid_months,
            academic_year=academic_year_name,
            is_paid=False
        ).delete()
        
        for month in valid_months:
            # Tuition Fee
            if student.tuition_fee > 0:
                mapping, created = StudentFeeMapping.objects.get_or_create(
                    student=student,
                    fee_category=tuition_cat,
                    month=month,
                    academic_year=academic_year_name,
                    defaults={'amount': student.tuition_fee, 'is_paid': False, 'paid_amount': 0}
                )
                if not created and not mapping.is_paid and mapping.amount != student.tuition_fee:
                    mapping.amount = student.tuition_fee
                    mapping.save(update_fields=['amount'])
            else:
                StudentFeeMapping.objects.filter(student=student, fee_category=tuition_cat, month=month, academic_year=academic_year_name, is_paid=False).delete()
            
            # Bus Fee
            if student.bus_fee > 0:
                mapping, created = StudentFeeMapping.objects.get_or_create(
                    student=student,
                    fee_category=bus_cat,
                    month=month,
                    academic_year=academic_year_name,
                    defaults={'amount': student.bus_fee, 'is_paid': False, 'paid_amount': 0}
                )
                if not created and not mapping.is_paid and mapping.amount != student.bus_fee:
                    mapping.amount = student.bus_fee
                    mapping.save(update_fields=['amount'])
            else:
                StudentFeeMapping.objects.filter(student=student, fee_category=bus_cat, month=month, academic_year=academic_year_name, is_paid=False).delete()
            
            # CCA Fee
            if student.cca_fee > 0:
                mapping, created = StudentFeeMapping.objects.get_or_create(
                    student=student,
                    fee_category=cca_cat,
                    month=month,
                    academic_year=academic_year_name,
                    defaults={'amount': student.cca_fee, 'is_paid': False, 'paid_amount': 0}
                )
                if not created and not mapping.is_paid and mapping.amount != student.cca_fee:
                    mapping.amount = student.cca_fee
                    mapping.save(update_fields=['amount'])
            else:
                StudentFeeMapping.objects.filter(student=student, fee_category=cca_cat, month=month, academic_year=academic_year_name, is_paid=False).delete()
                
        return True
    except Exception as e:
        print(f"Error in ensure_student_fee_mappings: {e}")
        return False

def get_pending_fees_queryset(student_id, academic_year, simulation_date=None):
    try:
        from students.models import Student
        from payments.models import StudentFeeMapping
        from django.db.models import F
        
        student = Student.objects.get(id=student_id)
        
        # Proactively ensure mappings exist before querying
        ensure_student_fee_mappings(student, academic_year)
        
        due_months = get_student_due_months(student, academic_year, simulation_date=simulation_date)
        
        qs = StudentFeeMapping.objects.filter(
            student=student,
            academic_year=academic_year,
            is_paid=False,
            amount__gt=F('paid_amount')
        )
        
        if due_months:
            return qs.filter(month__in=due_months)
            
        return StudentFeeMapping.objects.none()
    except Exception as e:
        print(f"Error in get_pending_fees_queryset: {e}")
        from payments.models import StudentFeeMapping
        return StudentFeeMapping.objects.none()

def get_month_year(month_name, academic_year, starting_month='April', short=False):
    """
    Returns 'Month Year' string (e.g. 'April 2026' or 'Jan 2027')
    """
    if not month_name or not academic_year:
        return month_name or ""
        
    m_start, _ = get_month_date_range(month_name, academic_year)
    if m_start:
        display_month = month_name[:3] if short else month_name
        return f"{display_month} {m_start.year}"
    return month_name

def get_short_month_ranges(month_names, academic_year, starting_month='April'):
    """
    Groups a list of month names into concise ranges like 'Apr-Jun 2026, Jan 2027'.
    """
    if not month_names:
        return ""
    
    month_data = []
    for m in month_names:
        m_start, _ = get_month_date_range(m, academic_year)
        if not m_start: continue
        
        m_num = m_start.month
        year = m_start.year
        
        month_data.append({'name': m, 'num': m_num, 'year': year, 'abs_val': year * 12 + m_num})
    
    month_data.sort(key=lambda x: x['abs_val'])
    
    if not month_data:
        return ""
        
    ranges = []
    start_m = month_data[0]
    prev_m = month_data[0]
    
    for i in range(1, len(month_data)):
        curr_m = month_data[i]
        if curr_m['abs_val'] == prev_m['abs_val'] + 1:
            prev_m = curr_m
        else:
            ranges.append((start_m, prev_m))
            start_m = curr_m
            prev_m = curr_m
    ranges.append((start_m, prev_m))
    
    formatted_ranges = []
    for r_start, r_end in ranges:
        start_name = r_start['name'][:3]
        end_name = r_end['name'][:3]
        
        if r_start['abs_val'] == r_end['abs_val']:
            formatted_ranges.append(f"{start_name} {r_start['year']}")
        elif r_start['year'] == r_end['year']:
            formatted_ranges.append(f"{start_name}-{end_name} {r_start['year']}")
        else:
            formatted_ranges.append(f"{start_name} {r_start['year']}-{end_name} {r_end['year']}")
            
    return ", ".join(formatted_ranges)
