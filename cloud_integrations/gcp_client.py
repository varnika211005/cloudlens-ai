"""
GCP Cloud Billing client for fetching billing data
"""

from google.cloud import billing_v1
from google.oauth2 import service_account
from datetime import datetime, timedelta
from decimal import Decimal
import json


class GCPCostClient:
    """Connect to GCP and fetch billing data"""
    
    def __init__(self, service_account_json):
        """Initialize GCP client"""
        try:
            if isinstance(service_account_json, str):
                service_account_json = json.loads(service_account_json)
            
            credentials = service_account.Credentials.from_service_account_info(
                service_account_json
            )
            
            self.project_id = service_account_json.get('project_id')
            self.credentials = credentials
            self.billing_client = billing_v1.CloudBillingClient(credentials=credentials)
            self.bigquery_client = None
            self.is_connected = True
        except Exception as e:
            self.is_connected = False
            self.error = str(e)

    def _get_bigquery_client(self):
        from google.cloud import bigquery
        if self.bigquery_client is None:
            self.bigquery_client = bigquery.Client(
                project=self.project_id,
                credentials=self.credentials
            )
        return self.bigquery_client
    
    def test_connection(self):
        """Test if credentials are valid"""
        try:
            client = self._get_bigquery_client()
            
            query = "SELECT 1"
            client.query(query).result()
            
            return True, "Connection successful"
        except Exception as e:
            return False, str(e)
    
    def get_daily_costs(self, days=30):
        """Get daily costs for the last N days"""
        try:
            client = self._get_bigquery_client()
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            query = f"""
            SELECT
                CAST(usage_start_time AS DATE) as date,
                service.description as service,
                SUM(cost) as total_cost
            FROM
                `{self.project_id}.billing_export.gcs_billing_export_v1`
            WHERE
                CAST(usage_start_time AS DATE) >= '{start_date}'
                AND CAST(usage_start_time AS DATE) < '{end_date}'
            GROUP BY
                date, service
            ORDER BY
                date DESC
            """
            
            query_job = client.query(query)
            results = query_job.result()
            
            daily_costs = {}
            
            for row in results:
                date_str = str(row['date'])
                service = row['service']
                cost = float(row['total_cost'])
                
                if date_str not in daily_costs:
                    daily_costs[date_str] = {
                        'date': date_str,
                        'total': Decimal('0'),
                        'services': {}
                    }
                
                daily_costs[date_str]['services'][service] = cost
                daily_costs[date_str]['total'] += Decimal(str(cost))
            
            result_list = []
            for date_key in sorted(daily_costs.keys(), reverse=True):
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
            client = self._get_bigquery_client()
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            query = f"""
            SELECT
                service.description as service,
                SUM(cost) as total_cost
            FROM
                `{self.project_id}.billing_export.gcs_billing_export_v1`
            WHERE
                CAST(usage_start_time AS DATE) >= '{start_date}'
                AND CAST(usage_start_time AS DATE) < '{end_date}'
            GROUP BY
                service
            ORDER BY
                total_cost DESC
            """
            
            query_job = client.query(query)
            results = query_job.result()
            
            service_costs = {}
            
            for row in results:
                service = row['service']
                cost = float(row['total_cost'])
                service_costs[service] = cost
            
            return service_costs
        
        except Exception as e:
            raise Exception(f"Failed to fetch service costs: {str(e)}")
    
    def get_total_cost(self, days=30):
        """Get total cost for the last N days"""
        try:
            client = self._get_bigquery_client()
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            query = f"""
            SELECT
                SUM(cost) as total_cost
            FROM
                `{self.project_id}.billing_export.gcs_billing_export_v1`
            WHERE
                CAST(usage_start_time AS DATE) >= '{start_date}'
                AND CAST(usage_start_time AS DATE) < '{end_date}'
            """
            
            query_job = client.query(query)
            result = query_job.result()
            
            total_cost = 0.0
            for row in result:
                total_cost = float(row['total_cost'])
            
            return total_cost
        
        except Exception as e:
            raise Exception(f"Failed to fetch total cost: {str(e)}")
