"""
Cloud integration views for fetching billing data
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from api.models import CloudCredentials, BillingCache, DailyBillingRecord
from api.serializers import CloudCredentialsSerializer
from cloud_integrations.encryption import encryptor
from cloud_integrations.aws_client import AWSCostClient
from cloud_integrations.azure_client import AzureCostClient
from cloud_integrations.gcp_client import GCPCostClient
import json


class FetchBillingView(APIView):
    """Fetch billing data from connected cloud"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, provider):
        """
        Fetch billing data from cloud provider
        POST /api/cloud/fetch/AWS/
        """
        try:
            # Get credentials
            credentials = CloudCredentials.objects.get(
                user=request.user,
                cloud_provider=provider
            )
            
            if not credentials.is_active:
                return Response(
                    {'error': f'{provider} is not active'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Decrypt and fetch
            if provider == 'AWS':
                access_key = encryptor.decrypt(credentials.encrypted_key_1)
                secret_key = encryptor.decrypt(credentials.encrypted_key_2)
                client = AWSCostClient(access_key, secret_key)
            elif provider == 'AZURE':
                client_id = encryptor.decrypt(credentials.encrypted_key_1)
                client_secret = encryptor.decrypt(credentials.encrypted_key_2)
                subscription_id = credentials.additional_data.get('subscription_id')
                tenant_id = credentials.additional_data.get('tenant_id')
                if not subscription_id or not tenant_id:
                    return Response(
                        {'error': 'Azure credentials are incomplete'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                client = AzureCostClient(
                    client_id=client_id,
                    client_secret=client_secret,
                    tenant_id=tenant_id,
                    subscription_id=subscription_id
                )
            elif provider == 'GCP':
                service_account_json = encryptor.decrypt(credentials.encrypted_key_1)
                client = GCPCostClient(service_account_json)
            else:
                return Response(
                    {'error': f'{provider} integration not yet implemented'},
                    status=status.HTTP_501_NOT_IMPLEMENTED
                )

            # Test connection
            is_valid, msg = client.test_connection()
            if not is_valid:
                credentials.is_verified = False
                credentials.connection_error = msg
                credentials.save()
                return Response(
                    {'error': 'Connection failed. Please verify credentials and permissions.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Fetch data
            daily_costs = client.get_daily_costs(days=30)
            service_costs = client.get_service_costs(days=30)
            total_cost = client.get_total_cost(days=30)
            
            # Mark as verified and update timestamp
            credentials.is_verified = True
            credentials.connection_error = ''
            credentials.last_tested_at = timezone.now()
            credentials.last_used_at = timezone.now()
            credentials.save()
            
            # Cache results
            expires_at = timezone.now() + timedelta(hours=6)
            BillingCache.objects.update_or_create(
                user=request.user,
                cloud_provider=provider,
                defaults={
                    'total_cost': total_cost,
                    'daily_costs': daily_costs,
                    'service_costs': service_costs,
                    'expires_at': expires_at,
                    'is_fresh': True
                }
            )
            
            return Response({
                'message': f'Billing data fetched from {provider}',
                'total_cost': total_cost,
                'daily_costs': daily_costs[:7],  # Last 7 days
                'service_costs': service_costs,
                'fetched_at': timezone.now()
            }, status=status.HTTP_200_OK)
        
        except CloudCredentials.DoesNotExist:
            return Response(
                {'error': f'{provider} account not connected'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class GetBillingView(APIView):
    """Get cached billing data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, provider):
        """
        Get cached billing data
        GET /api/cloud/billing/AWS/
        """
        try:
            cache = BillingCache.objects.get(
                user=request.user,
                cloud_provider=provider
            )
            
            # Check if cache is stale
            is_fresh = cache.expires_at > timezone.now()
            
            return Response({
                'provider': provider,
                'total_cost': float(cache.total_cost),
                'daily_costs': cache.daily_costs,
                'service_costs': cache.service_costs,
                'is_fresh': is_fresh,
                'fetched_at': cache.fetched_at,
                'expires_at': cache.expires_at
            }, status=status.HTTP_200_OK)
        
        except BillingCache.DoesNotExist:
            return Response(
                {'error': f'No billing data for {provider}. Please fetch first.'},
                status=status.HTTP_404_NOT_FOUND
            )


class BillingHistoryView(APIView):
    """Get historical billing records"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, provider):
        """
        Get historical billing records
        GET /api/cloud/history/AWS/?days=30
        """
        days = int(request.query_params.get('days', 30))
        
        try:
            records = DailyBillingRecord.objects.filter(
                user=request.user,
                cloud_provider=provider
            ).order_by('-date')[:days]
            
            data = []
            for record in records:
                data.append({
                    'date': record.date,
                    'total_cost': float(record.total_cost),
                    'service_costs': record.service_costs,
                    'region_costs': record.region_costs,
                    'is_anomaly': record.is_anomaly,
                    'anomaly_score': record.anomaly_score
                })
            
            return Response({
                'provider': provider,
                'records': data,
                'count': len(data)
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ComparisonView(APIView):
    """Compare costs across cloud providers"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Compare billing data across all clouds
        GET /api/cloud/compare/
        """
        try:
            caches = BillingCache.objects.filter(user=request.user)
            
            comparison = {}
            total_all = 0
            
            for cache in caches:
                comparison[cache.cloud_provider] = {
                    'total_cost': float(cache.total_cost),
                    'is_fresh': cache.expires_at > timezone.now(),
                    'fetched_at': cache.fetched_at
                }
                total_all += float(cache.total_cost)
            
            # Add percentages
            for provider in comparison:
                if total_all > 0:
                    percentage = (comparison[provider]['total_cost'] / total_all) * 100
                    comparison[provider]['percentage'] = round(percentage, 2)
                else:
                    comparison[provider]['percentage'] = 0
            
            return Response({
                'comparison': comparison,
                'total_cost': total_all,
                'providers_connected': len(comparison)
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
