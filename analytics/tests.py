from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from api.models import CloudCredentials


class AnalyticsApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='analytics@example.com',
            email='analytics@example.com',
            password='StrongPass123!',
        )
        token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_dashboard_returns_expected_shape(self):
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_cost', response.data)
        self.assertIn('clouds', response.data)
        self.assertIn('active_recommendations', response.data)

    def test_dashboard_sets_mock_mode_flag_when_demo_cloud_connected(self):
        CloudCredentials.objects.create(
            user=self.user,
            cloud_provider='AWS',
            encrypted_key_1='encrypted-demo-key-1',
            encrypted_key_2='encrypted-demo-key-2',
            additional_data={'is_mock': True},
            is_active=True,
        )

        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_mock_mode'))
