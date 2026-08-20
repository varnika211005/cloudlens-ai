"""
URL routing for cloud integration endpoints
"""

from django.urls import path
from .views import (
    FetchBillingView,
    GetBillingView,
    BillingHistoryView,
    ComparisonView
)

urlpatterns = [
    # Fetch billing data
    path('fetch/<str:provider>/', FetchBillingView.as_view(), name='fetch-billing'),
    
    # Get cached billing
    path('billing/<str:provider>/', GetBillingView.as_view(), name='get-billing'),
    
    # Historical data
    path('history/<str:provider>/', BillingHistoryView.as_view(), name='billing-history'),
    
    # Compare across clouds
    path('compare/', ComparisonView.as_view(), name='compare-clouds'),
]