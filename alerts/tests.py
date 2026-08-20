from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class AlertsApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alerts@example.com',
            email='alerts@example.com',
            password='StrongPass123!',
        )
        token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_list_rules_empty_state(self):
        response = self.client.get('/api/alerts/rules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
