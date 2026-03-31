from django.contrib import admin
from django.urls import path, include
from core.views import (
    BackupListCreateAPIView,
    BackupDownloadAPIView,
    SettingsView,
    RootAPIView,
    LicenseStatusAPIView,
    SystemEnvironmentAPIView,
    DatabaseResetAPIView
)

urlpatterns = [
    path('', RootAPIView.as_view(), name='root'),
    path('admin/', admin.site.urls),
    path('api/payments/', include('payments.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/backup/', BackupListCreateAPIView.as_view(), name='backup-list-create'),
    path('api/backup/<int:pk>/download/', BackupDownloadAPIView.as_view(), name='backup-download'),
    path('api/settings/', SettingsView.as_view(), name='settings'),
    path('api/system/environment/', SystemEnvironmentAPIView.as_view(), name='system-environment'),
    path('api/system/reset/', DatabaseResetAPIView.as_view(), name='system-reset'),
    path('api/license-status/', LicenseStatusAPIView.as_view(), name='license-status'),
    path('api/', include('students.urls')),
]

# ✅ STATIC FILES SERVING (IMPORTANT)
from django.conf import settings
from django.urls import re_path
from django.views.static import serve

urlpatterns += [
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]