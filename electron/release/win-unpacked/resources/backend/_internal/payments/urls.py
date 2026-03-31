from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FeeCategoryViewSet, 
    CCAActivityViewSet, 
    PaymentStatusViewSet, 
    ReceiptViewSet,
    StudentFeeMappingViewSet
)

router = DefaultRouter()
router.register(r'fee-categories', FeeCategoryViewSet, basename='fee-category')
router.register(r'cca-activities', CCAActivityViewSet, basename='cca-activity')
router.register(r'payment-statuses', PaymentStatusViewSet, basename='payment-status')
router.register(r'receipts', ReceiptViewSet, basename='receipt')
router.register(r'fee-mappings', StudentFeeMappingViewSet, basename='fee-mapping')

urlpatterns = [
    path('', include(router.urls)),
]
