from django.db import transaction
from payments.utils import clean_param
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import FeeCategory, CCAActivity, PaymentStatus, Receipt, StudentFeeMapping, ReceiptItem, DailyCollection, MonthlyCollection, ReceiptAuditLog
from .serializers import (
    FeeCategorySerializer, 
    CCAActivitySerializer, 
    PaymentStatusSerializer, 
    ReceiptSerializer,
    StudentFeeMappingSerializer
)

class FeeCategoryViewSet(viewsets.ModelViewSet):
    queryset = FeeCategory.objects.all().order_by('name')
    serializer_class = FeeCategorySerializer

class CCAActivityViewSet(viewsets.ModelViewSet):
    queryset = CCAActivity.objects.all().order_by('name')
    serializer_class = CCAActivitySerializer

class PaymentStatusViewSet(viewsets.ModelViewSet):
    queryset = PaymentStatus.objects.all().order_by('name')
    serializer_class = PaymentStatusSerializer

class StudentFeeMappingViewSet(viewsets.ModelViewSet):
    queryset = StudentFeeMapping.objects.select_related('student', 'fee_category').all()
    serializer_class = StudentFeeMappingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['student', 'is_paid', 'month', 'academic_year']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 1. Handle explicit IDs (e.g. from Pay button)
        ids = clean_param(self.request.query_params.get('ids'))
        if ids:
            id_list = [int(x) for x in ids.split(',') if x.isdigit()]
            if id_list:
                return queryset.filter(id__in=id_list)

        # 2. Handle Pending Fee lookup for a specific student
        is_paid_param = clean_param(self.request.query_params.get('is_paid'))
        student_id = clean_param(self.request.query_params.get('student'))
        academic_year = clean_param(self.request.query_params.get('academic_year'))
        
        # If searching for pending fees for a student, use the robust utility
        if is_paid_param == 'false' and student_id:
            from payments.utils import get_pending_fees_queryset
            # Use provided academic year or fall back to student's record
            ay = academic_year or '2024-25'
            queryset = get_pending_fees_queryset(student_id, ay).select_related('student', 'fee_category')
            
            # Since we've manually applied student, is_paid, and academic_year filters,
            # we should return here to avoid redundant (and potentially conflicting)
            # filtering by DjangoFilterBackend if it's still in the params.
            return queryset

        return queryset
    pagination_class = None

from rest_framework.decorators import action
from rest_framework import status
from django.utils import timezone

class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.prefetch_related('items', 'items__fee_category').select_related('student', 'payment_status').all().order_by('-date', '-id')
    serializer_class = ReceiptSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'payment_status', 'date', 'academic_year']
    search_fields = ['receipt_no', 'student__name', 'student__admission_no']
    ordering_fields = ['date', 'total_amount']

    @transaction.atomic
    def perform_create(self, serializer):
        # Default status to 'Paid' if not provided
        payment_status = self.request.data.get('payment_status')
        if not payment_status:
            try:
                from .models import PaymentStatus
                paid_status = PaymentStatus.objects.get(name='Paid')
                instance = serializer.save(payment_status=paid_status)
            except PaymentStatus.DoesNotExist:
                instance = serializer.save()
        else:
            instance = serializer.save()
            
        item_ids = self.request.data.get('item_ids', [])
        self._apply_receipt_impact(instance, item_ids)

    @transaction.atomic
    def perform_destroy(self, instance):
        # Soft delete
        self._revert_receipt_impact(instance)
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user if self.request.user.is_authenticated else None
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    @transaction.atomic
    def perform_update(self, serializer):
        old_instance = self.get_object()
        # Create a copy for comparison
        import copy
        old_copy = copy.copy(old_instance)
        
        self._revert_receipt_impact(old_instance)
        receipt = serializer.save()
        item_ids = self.request.data.get('item_ids', [])
        self._apply_receipt_impact(receipt, item_ids)
        
        # Record changes
        self._record_audit_log(old_copy, receipt, self.request.user)

    @action(detail=False, methods=['get'])
    def deleted(self, request):
        academic_year = clean_param(request.query_params.get('academic_year'))
        queryset = Receipt.all_objects.filter(is_deleted=True).prefetch_related('items', 'items__fee_category').select_related('student', 'payment_status').order_by('-deleted_at')
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
            
        # Manually apply search/filter if needed, or just use filter backends on all_objects
        # For simplicity, we filter manually here as this is a specific view
        search = clean_param(request.query_params.get('search'))
        if search:
            queryset = queryset.filter(
                Q(receipt_no__icontains=search) | 
                Q(student__name__icontains=search) | 
                Q(student__admission_no__icontains=search)
            )
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def restore(self, request, pk=None):
        receipt = Receipt.all_objects.get(pk=pk)
        if not receipt.is_deleted:
            return Response({'error': 'Receipt is not deleted'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Re-apply impact
        self._apply_receipt_impact_from_items(receipt)
        
        # Clear deletion metadata
        receipt.is_deleted = False
        receipt.deleted_at = None
        receipt.deleted_by = None
        receipt.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        
        return Response({'status': 'Receipt restored'})

    @action(detail=True, methods=['delete'])
    @transaction.atomic
    def permanent_delete(self, request, pk=None):
        instance = Receipt.all_objects.get(pk=pk)
        if not instance.is_deleted:
            # Revert impact before permanent delete if it wasn't already soft-deleted
            # (though normally permanent delete is called on soft-deleted items)
            self._revert_receipt_impact(instance)
            
        instance.delete() # Actual database deletion
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _apply_receipt_impact_from_items(self, receipt):
        items = receipt.items.all()
        for item in items:
            try:
                mapping = StudentFeeMapping.objects.get(
                    student=receipt.student,
                    fee_category=item.fee_category,
                    month=item.month,
                    academic_year=receipt.academic_year
                )
                mapping.paid_amount += item.amount
                if mapping.paid_amount >= mapping.amount:
                    mapping.is_paid = True
                mapping.save()
            except StudentFeeMapping.DoesNotExist: pass
            
        # Update Collections
        self._update_collections(receipt.date, receipt.total_amount, receipt.academic_year)

    def _update_collections(self, date_val, amount_val, academic_year):
        from datetime import date
        today = date_val
        if isinstance(today, str):
            from django.utils.dateparse import parse_date
            today = parse_date(today)
            
        daily, _ = DailyCollection.objects.get_or_create(date=today, academic_year=academic_year)
        daily.total_amount += amount_val
        daily.save()
        monthly, _ = MonthlyCollection.objects.get_or_create(
            month=today.month, 
            year=today.year,
            academic_year=academic_year
        )
        monthly.total_amount += amount_val
        monthly.save()

    def _record_audit_log(self, old_instance, new_instance, user):
        changes = {}
        fields_to_check = ['date', 'total_amount', 'payment_status', 'academic_year', 'student']
        for field in fields_to_check:
            old_val = getattr(old_instance, field)
            new_val = getattr(new_instance, field)
            
            # Simple string comparison for value types and IDs for objects
            old_cmp = str(old_val.id if hasattr(old_val, 'id') else old_val)
            new_cmp = str(new_val.id if hasattr(new_val, 'id') else new_val)
            
            if old_cmp != new_cmp:
                changes[field] = {
                    'old': str(old_val.name if hasattr(old_val, 'name') else old_val),
                    'new': str(new_val.name if hasattr(new_val, 'name') else new_val)
                }
        
        if changes:
            ReceiptAuditLog.objects.create(
                receipt=new_instance,
                user=user if user.is_authenticated else None,
                change_details=changes
            )
            new_instance.is_edited = True
            new_instance.save(update_fields=['is_edited'])

    def _apply_receipt_impact(self, receipt, item_ids):
        # Get remaining balance for selected mappings
        items_to_pay = StudentFeeMapping.objects.select_for_update().filter(id__in=item_ids, student=receipt.student).order_by('id')
        remaining_receipt_amount = receipt.total_amount
        
        for mapping in items_to_pay:
            if remaining_receipt_amount <= 0:
                break
            still_owed = mapping.amount - mapping.paid_amount
            amount_to_apply = min(remaining_receipt_amount, still_owed)
            
            if amount_to_apply > 0:
                ReceiptItem.objects.create(
                    receipt=receipt,
                    fee_category=mapping.fee_category,
                    amount=amount_to_apply,
                    month=mapping.month
                )
                mapping.paid_amount += amount_to_apply
                if mapping.paid_amount >= mapping.amount:
                    mapping.is_paid = True
                mapping.save()
                remaining_receipt_amount -= amount_to_apply
        
        # Update Collections
        self._update_collections(receipt.date, receipt.total_amount, receipt.academic_year)

    def _revert_receipt_impact(self, instance):
        items = instance.items.all()
        for item in items:
            try:
                mapping = StudentFeeMapping.objects.get(
                    student=instance.student,
                    fee_category=item.fee_category,
                    month=item.month,
                    academic_year=instance.academic_year
                )
                mapping.paid_amount -= item.amount
                if mapping.paid_amount < mapping.amount:
                    mapping.is_paid = False
                mapping.save()
            except StudentFeeMapping.DoesNotExist: pass
        
        # Roll back Collections
        from datetime import date
        today = instance.date
        if isinstance(today, str):
            from django.utils.dateparse import parse_date
            today = parse_date(today)
            
        try:
            daily = DailyCollection.objects.get(date=today, academic_year=instance.academic_year)
            daily.total_amount -= instance.total_amount
            daily.save()
            monthly = MonthlyCollection.objects.get(
                month=today.month, 
                year=today.year,
                academic_year=instance.academic_year
            )
            monthly.total_amount -= instance.total_amount
            monthly.save()
        except (DailyCollection.DoesNotExist, MonthlyCollection.DoesNotExist): pass
