from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import DailyBillingRecord
from .models import IdleResource, TagCostGroup


class CloudOptimizationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='optimize@example.com',
            email='optimize@example.com',
            password='StrongPass123!',
        )
        token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_simulation_create_and_fetch(self):
        create_response = self.client.post(
            '/api/optimize/simulate/',
            {
                'name': 'Test Simulation',
                'base_monthly_cost': '1000',
                'rightsizing_percent': '10',
                'reserved_savings_percent': '20',
                'spot_instances_percent': '5',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['projected_cost'], 650.0)
        self.assertEqual(create_response.data['monthly_savings'], 350.0)

        list_response = self.client.get('/api/optimize/simulate/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)

    def test_regions_endpoint_returns_recommendations(self):
        response = self.client.get('/api/optimize/regions/?provider=AWS&current_region=ap-south-1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_region'], 'ap-south-1')
        self.assertGreater(len(response.data['recommendations']), 0)

    def test_idle_resources_filters_by_type(self):
        IdleResource.objects.create(
            user=self.user,
            resource_id='i-123',
            resource_name='web-idle',
            resource_type='EC2',
            cloud_provider='AWS',
            region='us-east-1',
            monthly_cost=Decimal('100.00'),
            idle_duration_days=14,
            cpu_percent=Decimal('2.00'),
            network_mb_per_hour=Decimal('0.50'),
        )
        IdleResource.objects.create(
            user=self.user,
            resource_id='db-123',
            resource_name='db-idle',
            resource_type='RDS',
            cloud_provider='AWS',
            region='us-east-1',
            monthly_cost=Decimal('200.00'),
            idle_duration_days=30,
            cpu_percent=Decimal('1.00'),
            network_mb_per_hour=Decimal('0.10'),
        )

        response = self.client.get('/api/optimize/idle-resources/?provider=AWS&resource_type=EC2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['resources'][0]['type'], 'EC2')

    def test_cost_report_generation_from_daily_records(self):
        DailyBillingRecord.objects.create(
            user=self.user,
            cloud_provider='AWS',
            date=date(2026, 1, 1),
            total_cost=Decimal('25.50'),
            service_costs={'EC2': 20, 'S3': 5.5},
            region_costs={'us-east-1': 25.5},
        )
        DailyBillingRecord.objects.create(
            user=self.user,
            cloud_provider='AWS',
            date=date(2026, 1, 2),
            total_cost=Decimal('30.00'),
            service_costs={'EC2': 24, 'RDS': 6},
            region_costs={'us-east-1': 30},
        )

        response = self.client.post(
            '/api/optimize/reports/',
            {
                'report_type': 'CUSTOM',
                'period_start': '2026-01-01',
                'period_end': '2026-01-03',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'READY')
        self.assertEqual(response.data['total_cost'], 55.5)

    def test_tag_cost_allocation_returns_grouped_costs(self):
        TagCostGroup.objects.create(
            user=self.user,
            tag_key='environment',
            tag_value='production',
            cloud_provider='AWS',
            total_cost=Decimal('123.45'),
            resource_count=3,
            services={'EC2': 100.0, 'RDS': 23.45},
            resources=['i-1', 'db-1', 'lb-1'],
        )

        response = self.client.get('/api/optimize/tags/?provider=AWS')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['total_cost'], 123.45)
