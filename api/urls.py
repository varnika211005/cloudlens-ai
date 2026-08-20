"""
URL routing for API endpoints
"""

from django.urls import path
from .views import (
    SignupView, LoginView, LogoutView, ProfileView, ChangePasswordView,
    ConnectCloudView, ListConnectedCloudsView, DisconnectCloudView
)
from .views_chat import chat_with_ai

urlpatterns = [
    # Authentication
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Cloud connections
    path('connect/', ConnectCloudView.as_view(), name='connect-cloud'),
    path('list/', ListConnectedCloudsView.as_view(), name='list-clouds'),
    path('disconnect/<str:provider>/', DisconnectCloudView.as_view(), name='disconnect-cloud'),

    # ChatBot
    path('chat/', chat_with_ai, name='chat'),
]
