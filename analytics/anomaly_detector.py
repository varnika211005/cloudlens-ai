"""
Anomaly detection for cost spikes
Uses statistical methods to find unusual spending
"""

import numpy as np
from datetime import datetime, timedelta
from decimal import Decimal


class AnomalyDetector:
    """Detect cost anomalies using statistical methods"""
    
    def __init__(self, sensitivity=2.0):
        """
        sensitivity: How strict anomaly detection is
        1.5 = Very sensitive (more false positives)
        2.0 = Balanced (default)
        3.0 = Conservative (fewer false positives)
        """
        self.sensitivity = sensitivity
    
    def detect_anomalies(self, daily_costs):
        """
        Detect anomalies in daily costs
        
        Args:
            daily_costs: List of dicts with 'date' and 'total' keys
        
        Returns:
            List of anomalies with dates and scores
        """
        if len(daily_costs) < 3:
            return []
        
        costs = [float(d['total']) for d in daily_costs]
        
        # Calculate statistics
        mean = np.mean(costs)
        std_dev = np.std(costs)
        
        if std_dev == 0:
            return []
        
        anomalies = []
        
        for i, (cost, day) in enumerate(zip(costs, daily_costs)):
            # Z-score: how many standard deviations from mean
            z_score = abs((cost - mean) / std_dev)
            
            # If exceeds threshold, mark as anomaly
            if z_score > self.sensitivity:
                # Calculate percentage change from previous day
                if i > 0:
                    prev_cost = costs[i - 1]
                    change_percent = ((cost - prev_cost) / prev_cost * 100) if prev_cost > 0 else 0
                else:
                    change_percent = 0
                
                anomaly_score = min(z_score / self.sensitivity, 1.0)
                
                anomalies.append({
                    'date': day['date'],
                    'cost': cost,
                    'expected_cost': mean,
                    'z_score': round(z_score, 2),
                    'anomaly_score': round(anomaly_score, 2),
                    'change_percent': round(change_percent, 2),
                    'severity': self._get_severity(z_score)
                })
        
        return anomalies
    
    def _get_severity(self, z_score):
        """Classify anomaly severity"""
        if z_score > 4:
            return 'CRITICAL'
        elif z_score > 3:
            return 'HIGH'
        elif z_score > self.sensitivity:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def forecast_cost(self, daily_costs, days_ahead=7):
        """
        Simple forecast of future costs
        Uses moving average method
        
        Args:
            daily_costs: List of daily cost dicts
            days_ahead: How many days to forecast
        
        Returns:
            List of forecasted costs
        """
        if len(daily_costs) < 7:
            return []
        
        costs = [float(d['total']) for d in daily_costs]
        
        # 7-day moving average
        window = 7
        forecast = []
        
        for i in range(days_ahead):
            avg = np.mean(costs[-window:])
            forecast.append({
                'days_ahead': i + 1,
                'forecasted_cost': round(avg, 2),
                'confidence': 0.85
            })
        
        return forecast
    
    def detect_trend(self, daily_costs):
        """
        Detect if costs are trending up or down
        
        Returns:
            'UP', 'DOWN', or 'STABLE'
        """
        if len(daily_costs) < 7:
            return 'UNKNOWN'
        
        costs = [float(d['total']) for d in daily_costs]
        
        # Compare first half vs second half
        mid = len(costs) // 2
        first_half_avg = np.mean(costs[:mid])
        second_half_avg = np.mean(costs[mid:])
        
        change_percent = ((second_half_avg - first_half_avg) / first_half_avg * 100) if first_half_avg > 0 else 0
        
        if change_percent > 5:
            return 'UP'
        elif change_percent < -5:
            return 'DOWN'
        else:
            return 'STABLE'


class RecommendationEngine:
    """Generate cost optimization recommendations"""
    
    def __init__(self):
        self.recommendations = []
    
    def analyze_service_costs(self, service_costs):
        """
        Analyze service-level costs and suggest optimizations
        
        Args:
            service_costs: Dict of {service: cost}
        
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Sort by cost
        sorted_services = sorted(service_costs.items(), key=lambda x: x[1], reverse=True)
        top_services = sorted_services[:5]
        
        for service, cost in top_services:
            if cost > 100:  # If service costs > $100/day
                recommendation = {
                    'service': service,
                    'current_cost': round(cost, 2),
                    'title': f'Optimize {service}',
                    'description': f'{service} is costing ${cost:.2f}/day',
                    'actions': self._get_optimization_actions(service),
                    'estimated_savings': round(cost * 0.20, 2),  # 20% potential savings
                    'priority': self._get_priority_score(cost)
                }
                recommendations.append(recommendation)
        
        return recommendations
    
    def _get_optimization_actions(self, service):
        """Get specific optimization actions for each service"""
        actions = {
            'EC2': [
                'Use Reserved Instances for long-running workloads',
                'Implement auto-scaling policies',
                'Right-size instances based on actual usage',
                'Use Spot Instances for non-critical workloads'
            ],
            'RDS': [
                'Switch to Reserved Instances',
                'Consolidate databases',
                'Enable automated backups optimization'
            ],
            'S3': [
                'Enable S3 Intelligent-Tiering',
                'Delete unused S3 buckets',
                'Use Lifecycle Policies for old data'
            ],
            'Lambda': [
                'Optimize memory allocation',
                'Reduce function execution time',
                'Consolidate functions'
            ],
            'CloudFront': [
                'Review cache settings',
                'Remove unused distributions'
            ]
        }
        
        return actions.get(service, ['Review usage patterns', 'Consider alternative services'])
    
    def _get_priority_score(self, cost):
        """Get priority score based on cost"""
        if cost > 500:
            return 10
        elif cost > 200:
            return 7
        elif cost > 100:
            return 5
        else:
            return 3