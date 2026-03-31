from django.urls import path
from .views import (
    DashboardAPIView,
    DateWiseCollectionAPIView,
    FeeTypeReportAPIView,
    StudentWiseReportAPIView,
    ClassWiseReportAPIView,
    MonthlySummaryAPIView,
    PendingReportAPIView,
    StudentListReportAPIView
)

urlpatterns = [
    path('dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('collection/', DateWiseCollectionAPIView.as_view(), name='collection-report'),
    path('fee-types/', FeeTypeReportAPIView.as_view(), name='fee-type-report'),
    path('student/', StudentWiseReportAPIView.as_view(), name='student-wise-report'),
    path('classes/', ClassWiseReportAPIView.as_view(), name='class-wise-report'),
    path('monthly/', MonthlySummaryAPIView.as_view(), name='monthly-summary'),
    path('pending/', PendingReportAPIView.as_view(), name='pending-report'),
    path('student-list/', StudentListReportAPIView.as_view(), name='student-list-report'),
]
