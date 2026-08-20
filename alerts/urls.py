"""
URL routing for alert endpoints
"""

from django.urls import path
from .views import (
    CreateAlertRuleView,
    ListAlertRulesView,
    ListAlertLogsView,
    AcknowledgeAlertView,
    TestAnomalyDetectionView,
    SendTestAlertView
)

urlpatterns = [
    # Alert rules
    path('rules/create/', CreateAlertRuleView.as_view(), name='create-rule'),
    path('rules/', ListAlertRulesView.as_view(), name='list-rules'),
    
    # Alert logs (history)
    path('logs/', ListAlertLogsView.as_view(), name='list-logs'),
    path('acknowledge/<int:log_id>/', AcknowledgeAlertView.as_view(), name='acknowledge-alert'),
    
    # Testing
    path('test-anomaly/<str:provider>/', TestAnomalyDetectionView.as_view(), name='test-anomaly'),
    path('test-alert/', SendTestAlertView.as_view(), name='test-alert'),
]