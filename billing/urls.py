from django.urls import path
from .views import chat_with_billing_ai, get_carbon_footprint

urlpatterns = [
    path('chat/', chat_with_billing_ai, name='chat'),
    path('carbon/', get_carbon_footprint, name='carbon-footprint'),
]