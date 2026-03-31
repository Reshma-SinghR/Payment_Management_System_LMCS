from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.db.models import Sum
from .models import Student
from payments.models import StudentFeeMapping, FeeCategory
from payments.utils import MONTH_MAP

@receiver(post_save, sender=Student)
def create_student_fees(sender, instance, created, **kwargs):
    from payments.utils import ensure_student_fee_mappings
    ensure_student_fee_mappings(instance, instance.academic_year)

@receiver(m2m_changed, sender=Student.cca_activities.through)
def update_student_cca_fee(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        # Recalculate total CCA fee
        total_cca = instance.cca_activities.aggregate(total=Sum('monthly_fee'))['total'] or 0
        instance.cca_fee = total_cca
        instance.save(update_fields=['cca_fee'])
        
        # Update or create mappings for all 12 months in the cycle
        cca_cat, _ = FeeCategory.objects.get_or_create(name='CCA')
        
        start_num = MONTH_MAP.get(instance.starting_month, 4)
        relevant_months = []
        current_num = start_num
        while True:
            m_name = [name for name, num in MONTH_MAP.items() if num == current_num][0]
            relevant_months.append(m_name)
            if current_num == 3: # March reached
                break
            current_num = (current_num % 12) + 1
            if len(relevant_months) >= 12:
                break

        for month in relevant_months:
            mapping, created = StudentFeeMapping.objects.get_or_create(
                student=instance,
                fee_category=cca_cat,
                month=month,
                academic_year=instance.academic_year,
                defaults={'amount': total_cca, 'is_paid': False, 'paid_amount': 0}
            )
            if not created and not mapping.is_paid:
                mapping.amount = total_cca
                mapping.save()
