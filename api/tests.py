from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import UserProfile


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='OldPass123!',
        )
        self.token = Token.objects.create(user=self.user)

    def test_signup_creates_user_profile(self):
        response = self.client.post(
            '/api/auth/signup/',
            {
                'email': 'newuser@example.com',
                'password': 'StrongPass123!',
                'password_confirm': 'StrongPass123!',
                'first_name': 'New',
                'last_name': 'User',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='newuser@example.com')
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_change_password_endpoint(self):
        user = self.user
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        response = self.client.post(
            '/api/auth/change-password/',
            {
                'old_password': 'OldPass123!',
                'new_password': 'NewPass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewPass123!'))
        self.assertIn('token', response.data)

    def test_demo_sample_aws_connection_sets_mock_mode_flags(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        connect_response = self.client.post(
            '/api/auth/connect/',
            {
                'cloud_provider': 'AWS',
                'aws_access_key': 'demo-access-key',
                'aws_secret_key': 'demo-secret-key',
            },
            format='json',
        )

        self.assertEqual(connect_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(connect_response.data['credential']['is_mock_mode'])

        list_response = self.client.get('/api/auth/list/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(list_response.data['is_mock_mode'])
        self.assertTrue(list_response.data['connected_clouds'][0]['is_mock_mode'])
