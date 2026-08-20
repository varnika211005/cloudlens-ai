"""
AWS Cost Explorer client for fetching billing data
"""

import boto3
from datetime import datetime, timedelta
from decimal import Decimal
import json


class AWSCostClient:
    """Connect to AWS and fetch billing data"""
    
    def __init__(self, access_key, secret_key, region='us-east-1'):
        """Initialize AWS client"""
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region
        
        try:
            self.ce_client = boto3.client(
                'ce',
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key
            )
            self.is_connected = True
        except Exception as e:
            self.is_connected = False
            self.error = str(e)
    
    def test_connection(self):
        """Test if credentials are valid"""
        try:
            self.ce_client.get_cost_and_usage(
                TimePeriod={
                    'Start': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d'),
                    'End': datetime.now().strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['UnblendedCost']
            )
            return True, "Connection successful"
        except Exception as e:
            return False, str(e)
    
    def get_daily_costs(self, days=30):
        """Get daily costs for the last N days"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            response = self.ce_client.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['UnblendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            daily_costs = []
            for result in response['ResultsByTime']:
                date = result['TimePeriod']['Start']
                total = Decimal('0')
                services = {}
                
                for group in result['Groups']:
                    service = group['Keys'][0]
                    cost = Decimal(group['Metrics']['UnblendedCost']['Amount'])
                    services[service] = float(cost)
                    total += cost
                
                daily_costs.append({
                    'date': date,
                    'total': float(total),
                    'services': services
                })
            
            return daily_costs
        
        except Exception as e:
            raise Exception(f"Failed to fetch daily costs: {str(e)}")
    
    def get_service_costs(self, days=30):
        """Get costs by service"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            response = self.ce_client.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='MONTHLY',
                Metrics=['UnblendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            service_costs = {}
            for result in response['ResultsByTime']:
                for group in result['Groups']:
                    service = group['Keys'][0]
                    cost = Decimal(group['Metrics']['UnblendedCost']['Amount'])
                    
                    if service not in service_costs:
                        service_costs[service] = Decimal('0')
                    service_costs[service] += cost
            
            return {k: float(v) for k, v in service_costs.items()}
        
        except Exception as e:
            raise Exception(f"Failed to fetch service costs: {str(e)}")
    
    def get_total_cost(self, days=30):
        """Get total cost for the last N days"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            response = self.ce_client.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.strftime('%Y-%m-%d'),
                    'End': end_date.strftime('%Y-%m-%d')
                },
                Granularity='MONTHLY',
                Metrics=['UnblendedCost']
            )
            
            total = Decimal('0')
            for result in response['ResultsByTime']:
                cost = Decimal(result['Total']['UnblendedCost']['Amount'])
                total += cost
            
            return float(total)
        
        except Exception as e:
            raise Exception(f"Failed to fetch total cost: {str(e)}")