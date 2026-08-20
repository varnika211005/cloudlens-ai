"""
Alert management views
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.mail import send_mail
from datetime import datetime

from .models import AlertRule, AlertLog
from api.models import CloudCredentials, BillingCache, CostAlert
from analytics.anomaly_detector import AnomalyDetector


class CreateAlertRuleView(APIView):
    """Create a new alert rule"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create alert rule
        POST /api/alerts/rules/create/
        """
        try:
            rule = AlertRule.objects.create(
                user=request.user,
                name=request.data.get('name'),
                alert_type=request.data.get('alert_type'),
                cloud_provider=request.data.get('cloud_provider'),
                threshold_value=request.data.get('threshold_value'),
                threshold_unit=request.data.get('threshold_unit', 'USD'),
                notify_email=request.data.get('notify_email', True),
                notify_slack=request.data.get('notify_slack', False),
                notify_whatsapp=request.data.get('notify_whatsapp', False),
                is_active=request.data.get('is_active', True)
            )
            
            return Response({
                'message': 'Alert rule created',
                'rule_id': rule.id,
                'name': rule.name
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ListAlertRulesView(APIView):
    """List all alert rules for user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all alert rules"""
        rules = AlertRule.objects.filter(user=request.user)
        
        data = []
        for rule in rules:
            data.append({
                'id': rule.id,
                'name': rule.name,
                'alert_type': rule.alert_type,
                'cloud_provider': rule.cloud_provider,
                'threshold_value': float(rule.threshold_value),
                'is_active': rule.is_active,
                'created_at': rule.created_at
            })
        
        return Response({
            'rules': data,
            'count': len(data)
        }, status=status.HTTP_200_OK)


class ListAlertLogsView(APIView):
    """List alert logs (history)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get alert history"""
        limit = int(request.query_params.get('limit', 50))
        alert_type = request.query_params.get('type')
        
        query = AlertLog.objects.filter(user=request.user)
        
        if alert_type:
            query = query.filter(alert_type=alert_type)
        
        logs = query[:limit]
        
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'title': log.title,
                'alert_type': log.alert_type,
                'cloud_provider': log.cloud_provider,
                'triggered_value': float(log.triggered_value),
                'threshold_value': float(log.threshold_value),
                'status': log.status,
                'triggered_at': log.triggered_at,
                'email_sent': log.email_sent,
                'slack_sent': log.slack_sent
            })
        
        return Response({
            'logs': data,
            'count': len(data)
        }, status=status.HTTP_200_OK)


class AcknowledgeAlertView(APIView):
    """Mark alert as acknowledged"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, log_id):
        """
        Acknowledge an alert
        POST /api/alerts/acknowledge/1/
        """
        try:
            log = AlertLog.objects.get(id=log_id, user=request.user)
            log.status = 'ACKNOWLEDGED'
            log.acknowledged_at = timezone.now()
            log.save()
            
            return Response({
                'message': 'Alert acknowledged',
                'log_id': log.id
            }, status=status.HTTP_200_OK)
        
        except AlertLog.DoesNotExist:
            return Response(
                {'error': 'Alert not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class TestAnomalyDetectionView(APIView):
    """Test anomaly detection on current data"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, provider):
        """
        Test anomaly detection
        POST /api/alerts/test-anomaly/AWS/
        """
        try:
            # Get cached billing data
            from api.models import BillingCache
            cache = BillingCache.objects.get(
                user=request.user,
                cloud_provider=provider
            )
            
            # Run anomaly detection
            detector = AnomalyDetector(sensitivity=2.0)
            anomalies = detector.detect_anomalies(cache.daily_costs)
            
            # Get trend
            trend = detector.detect_trend(cache.daily_costs)
            
            # Get forecast
            forecast = detector.forecast_cost(cache.daily_costs, days_ahead=7)
            
            return Response({
                'provider': provider,
                'anomalies_detected': len(anomalies),
                'anomalies': anomalies,
                'trend': trend,
                'forecast': forecast
            }, status=status.HTTP_200_OK)
        
        except BillingCache.DoesNotExist:
            return Response(
                {'error': f'No data for {provider}. Please fetch billing data first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class SendTestAlertView(APIView):
    """Send a test alert notification"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Send test alert to verify notifications work
        POST /api/alerts/test-alert/
        """
        try:
            email = request.data.get('email', request.user.email)
            
            # Send test email
            send_mail(
                subject='CloudLens AI - Test Alert',
                message='This is a test alert from CloudLens AI. If you received this, email notifications are working!',
                from_email='noreply@cloudlens.ai',
                recipient_list=[email],
                fail_silently=False,
            )
            
            return Response({
                'message': f'Test alert sent to {email}'
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )