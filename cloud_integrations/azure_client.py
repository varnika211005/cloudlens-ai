"""
Azure Cost Management client for fetching billing data
"""

from azure.identity import ClientSecretCredential
from azure.mgmt.costmanagement import CostManagementClient
from datetime import datetime, timedelta
from decimal import Decimal
import json


class AzureCostClient:
    """Connect to Azure and fetch billing data"""
    
    def __init__(self, client_id, client_secret, tenant_id, subscription_id):
        """Initialize Azure client"""
        try:
            self.tenant_id = tenant_id
            self.subscription_id = subscription_id
            
            credential = ClientSecretCredential(
                client_id=client_id,
                client_secret=client_secret,
                tenant_id=tenant_id
            )
            
            self.client = CostManagementClient(credential, subscription_id)
            self.is_connected = True
        except Exception as e:
            self.is_connected = False
            self.error = str(e)
    
    def test_connection(self):
        """Test if credentials are valid"""
        try:
            scope = f"subscriptions/{self.subscription_id}"
            query = {
                "type": "Usage",
                "timeframe": "MonthToDate",
                "dataset": {
                    "granularity": "Daily",
                    "aggregation": {
                        "totalCost": {"name": "PreTaxCost", "function": "Sum"}
                    }
                }
            }
            self.client.query.usage(scope, query)
            return True, "Connection successful"
        except Exception as e:
            return False, str(e)
    
    def get_daily_costs(self, days=30):
        """Get daily costs for the last N days"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            scope = f"subscriptions/{self.subscription_id}"
            
            query = {
                "type": "Usage",
                "timeframe": "Custom",
                "timePeriod": {
                    "from": f"{start_date}T00:00:00Z",
                    "to": f"{end_date}T23:59:59Z"
                },
                "dataset": {
                    "granularity": "Daily",
                    "aggregation": {
                        "totalCost": {"name": "PreTaxCost", "function": "Sum"}
                    },
                    "grouping": [
                        {"type": "Dimension", "name": "ServiceName"},
                        {"type": "Dimension", "name": "UsageDate"}
                    ]
                }
            }
            
            result = self.client.query.usage(scope, query)
            
            daily_costs = {}
            
            for row in result.rows:
                if len(row) >= 3:
                    date_str = row[1]  # UsageDate
                    service = row[0]   # ServiceName
                    cost = float(row[2])  # PreTaxCost
                    
                    if date_str not in daily_costs:
                        daily_costs[date_str] = {
                            'date': date_str,
                            'total': Decimal('0'),
                            'services': {}
                        }
                    
                    daily_costs[date_str]['services'][service] = float(cost)
                    daily_costs[date_str]['total'] += Decimal(str(cost))
            
            result_list = []
            for date_key in sorted(daily_costs.keys()):
                entry = daily_costs[date_key]
                result_list.append({
                    'date': entry['date'],
                    'total': float(entry['total']),
                    'services': entry['services']
                })
            
            return result_list
        
        except Exception as e:
            raise Exception(f"Failed to fetch daily costs: {str(e)}")
    
    def get_service_costs(self, days=30):
        """Get costs by service"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            scope = f"subscriptions/{self.subscription_id}"
            
            query = {
                "type": "Usage",
                "timeframe": "Custom",
                "timePeriod": {
                    "from": f"{start_date}T00:00:00Z",
                    "to": f"{end_date}T23:59:59Z"
                },
                "dataset": {
                    "granularity": "Monthly",
                    "aggregation": {
                        "totalCost": {"name": "PreTaxCost", "function": "Sum"}
                    },
                    "grouping": [
                        {"type": "Dimension", "name": "ServiceName"}
                    ]
                }
            }
            
            result = self.client.query.usage(scope, query)
            
            service_costs = {}
            
            for row in result.rows:
                if len(row) >= 2:
                    service = row[0]
                    cost = float(row[1])
                    
                    if service not in service_costs:
                        service_costs[service] = Decimal('0')
                    service_costs[service] += Decimal(str(cost))
            
            return {k: float(v) for k, v in service_costs.items()}
        
        except Exception as e:
            raise Exception(f"Failed to fetch service costs: {str(e)}")
    
    def get_total_cost(self, days=30):
        """Get total cost for the last N days"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            scope = f"subscriptions/{self.subscription_id}"
            
            query = {
                "type": "Usage",
                "timeframe": "Custom",
                "timePeriod": {
                    "from": f"{start_date}T00:00:00Z",
                    "to": f"{end_date}T23:59:59Z"
                },
                "dataset": {
                    "granularity": "Monthly",
                    "aggregation": {
                        "totalCost": {"name": "PreTaxCost", "function": "Sum"}
                    }
                }
            }
            
            result = self.client.query.usage(scope, query)
            
            total = Decimal('0')
            
            for row in result.rows:
                if len(row) >= 1:
                    cost = Decimal(str(row[0]))
                    total += cost
            
            return float(total)
        
        except Exception as e:
            raise Exception(f"Failed to fetch total cost: {str(e)}")
