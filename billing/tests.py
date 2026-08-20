from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class BillingApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='billing@example.com',
            email='billing@example.com',
            password='StrongPass123!',
        )
        token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_carbon_footprint_requires_connected_billing_data(self):
        response = self.client.get('/api/billing/carbon/?provider=AWS&days=30')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
