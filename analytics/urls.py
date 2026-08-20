"""
URL routing for analytics endpoints
"""

from django.urls import path
from .views import (
    CostSummaryView,
    RecommendationsView,
    DashboardView
)

urlpatterns = [
    # Cost summary and statistics
    path('summary/<str:provider>/', CostSummaryView.as_view(), name='cost-summary'),
    
    # Recommendations
    path('recommendations/', RecommendationsView.as_view(), name='list-recommendations'),
    path('recommendations/<str:provider>/', RecommendationsView.as_view(), name='provider-recommendations'),
    
    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]