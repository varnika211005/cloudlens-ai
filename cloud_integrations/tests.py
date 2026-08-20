from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from api.models import BillingCache, CloudCredentials


class FetchBillingViewProviderTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='cloud@test.com',
            email='cloud@test.com',
            password='StrongPass123!',
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    @patch('cloud_integrations.views.AzureCostClient')
    @patch('cloud_integrations.views.encryptor.decrypt')
    def test_fetch_billing_azure_success(self, mock_decrypt, mock_azure_client):
        CloudCredentials.objects.create(
            user=self.user,
            cloud_provider='AZURE',
            encrypted_key_1='enc-client-id',
            encrypted_key_2='enc-client-secret',
            encrypted_key_3='',
            additional_data={
                'subscription_id': 'sub-123',
                'tenant_id': 'tenant-123',
            },
            is_active=True,
        )

        mock_decrypt.side_effect = ['client-id', 'client-secret']
        mock_client = mock_azure_client.return_value
        mock_client.test_connection.return_value = (True, 'ok')
        mock_client.get_daily_costs.return_value = [{'date': '2026-01-01', 'total': 10.0, 'services': {}}]
        mock_client.get_service_costs.return_value = {'Compute': 10.0}
        mock_client.get_total_cost.return_value = 10.0

        response = self.client.post('/api/cloud/fetch/AZURE/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_cost'], 10.0)
        self.assertTrue(BillingCache.objects.filter(user=self.user, cloud_provider='AZURE').exists())

    @patch('cloud_integrations.views.GCPCostClient')
    @patch('cloud_integrations.views.encryptor.decrypt')
    def test_fetch_billing_gcp_success(self, mock_decrypt, mock_gcp_client):
        CloudCredentials.objects.create(
            user=self.user,
            cloud_provider='GCP',
            encrypted_key_1='enc-service-account',
            encrypted_key_2='',
            encrypted_key_3='',
            additional_data={},
            is_active=True,
        )

        mock_decrypt.return_value = '{"project_id":"demo-project"}'
        mock_client = mock_gcp_client.return_value
        mock_client.test_connection.return_value = (True, 'ok')
        mock_client.get_daily_costs.return_value = [{'date': '2026-01-01', 'total': 20.0, 'services': {}}]
        mock_client.get_service_costs.return_value = {'BigQuery': 20.0}
        mock_client.get_total_cost.return_value = 20.0

        response = self.client.post('/api/cloud/fetch/GCP/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_cost'], 20.0)
        self.assertTrue(BillingCache.objects.filter(user=self.user, cloud_provider='GCP').exists())
