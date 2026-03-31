from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, AcademicYearViewSet, SchoolClassViewSet, BusViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'academic-years', AcademicYearViewSet, basename='academic-year')
router.register(r'school-classes', SchoolClassViewSet, basename='school-class')
router.register(r'buses', BusViewSet, basename='bus')

urlpatterns = [
    path('', include(router.urls)),
]
