from django.urls import path

from .views import CostReportView, CostSimulationView, IdleResourcesView, RegionAdvisorView, TagCostAllocationView

urlpatterns = [
    # Simulations
    path('simulate/', CostSimulationView.as_view(), name='simulate'),
    path('simulate/<int:simulation_id>/', CostSimulationView.as_view(), name='get-simulate'),
    # Region advisor
    path('regions/', RegionAdvisorView.as_view(), name='regions'),
    # Idle resources
    path('idle-resources/', IdleResourcesView.as_view(), name='idle-resources'),
    # Reports
    path('reports/', CostReportView.as_view(), name='reports'),
    path('reports/<int:report_id>/', CostReportView.as_view(), name='get-report'),
    # Tags
    path('tags/', TagCostAllocationView.as_view(), name='tags'),
]
