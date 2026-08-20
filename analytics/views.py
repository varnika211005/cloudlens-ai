"""
Analytics and insights views
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg
from datetime import datetime, timedelta

from api.models import DailyBillingRecord, Recommendation
from analytics.anomaly_detector import RecommendationEngine


class CostSummaryView(APIView):
    """Get cost summary and statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, provider):
        """
        Get cost summary
        GET /api/billing/summary/AWS/?days=30
        """
        days = int(request.query_params.get('days', 30))
        
        try:
            # Get records
            records = DailyBillingRecord.objects.filter(
                user=request.user,
                cloud_provider=provider,
                date__gte=datetime.now().date() - timedelta(days=days)
            )
            
            # Calculate statistics
            total_cost = records.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
            avg_daily = records.aggregate(Avg('total_cost'))['total_cost__avg'] or 0
            
            # Find max and min
            max_record = records.order_by('-total_cost').first()
            min_record = records.order_by('total_cost').first()
            
            max_cost = float(max_record.total_cost) if max_record else 0
            min_cost = float(min_record.total_cost) if min_record else 0
            
            # Calculate forecast (30 days ahead)
            forecasted_monthly = avg_daily * 30
            
            return Response({
                'provider': provider,
                'period_days': days,
                'total_cost': float(total_cost),
                'daily_average': round(float(avg_daily), 2),
                'max_daily_cost': round(max_cost, 2),
                'min_daily_cost': round(min_cost, 2),
                'forecasted_monthly': round(forecasted_monthly, 2),
                'records_count': records.count()
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class RecommendationsView(APIView):
    """Get AI-generated recommendations"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, provider=None):
        """
        Get recommendations
        GET /api/billing/recommendations/AWS/
        or GET /api/billing/recommendations/ (all clouds)
        """
        try:
            query = Recommendation.objects.filter(
                user=request.user,
                is_active=True
            )
            
            if provider:
                query = query.filter(cloud_provider=provider)
            
            recommendations = query.order_by('-priority_score')
            
            data = []
            for rec in recommendations:
                data.append({
                    'id': rec.id,
                    'title': rec.title,
                    'description': rec.description,
                    'action': rec.action,
                    'cloud_provider': rec.cloud_provider,
                    'estimated_monthly_savings': float(rec.estimated_monthly_savings),
                    'estimated_yearly_savings': float(rec.estimated_yearly_savings),
                    'priority_score': rec.priority_score,
                    'is_completed': rec.is_completed
                })
            
            total_savings = sum(float(r.estimated_monthly_savings) for r in query)
            
            return Response({
                'recommendations': data,
                'count': len(data),
                'total_potential_savings_monthly': round(total_savings, 2)
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def post(self, request, provider):
        """
        Generate recommendations for a cloud provider
        POST /api/billing/recommendations/AWS/
        """
        try:
            from api.models import BillingCache
            
            # Get cached billing data
            cache = BillingCache.objects.get(
                user=request.user,
                cloud_provider=provider
            )
            
            # Run recommendation engine
            engine = RecommendationEngine()
            recs = engine.analyze_service_costs(cache.service_costs)
            
            # Save recommendations to database
            for rec in recs:
                Recommendation.objects.create(
                    user=request.user,
                    cloud_provider=provider,
                    title=rec['title'],
                    description=rec['description'],
                    action='\n'.join(rec['actions']),
                    reason=f"Service analysis detected high costs in {rec['service']}",
                    estimated_monthly_savings=rec['estimated_savings'],
                    estimated_yearly_savings=rec['estimated_savings'] * 12,
                    priority_score=rec['priority']
                )
            
            return Response({
                'message': f'Generated {len(recs)} recommendations',
                'recommendations': recs
            }, status=status.HTTP_201_CREATED)
        
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


class DashboardView(APIView):
    """Get complete dashboard data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get dashboard overview
        GET /api/billing/dashboard/
        """
        try:
            from api.models import BillingCache, CloudCredentials
            
            # Get all cloud data
            caches = BillingCache.objects.filter(user=request.user)
            
            total_cost = 0
            clouds_data = []
            
            for cache in caches:
                total_cost += float(cache.total_cost)
                clouds_data.append({
                    'provider': cache.cloud_provider,
                    'total_cost': float(cache.total_cost),
                    'is_fresh': cache.expires_at > datetime.now().astimezone(),
                    'top_services': sorted(
                        cache.service_costs.items(),
                        key=lambda x: x[1],
                        reverse=True
                    )[:5]
                })
            
            # Get active recommendations
            active_recs = Recommendation.objects.filter(
                user=request.user,
                is_active=True
            ).count()
            
            # Get recent alerts
            from alerts.models import AlertLog
            recent_alerts = AlertLog.objects.filter(
                user=request.user
            ).order_by('-triggered_at')[:5]
            
            alerts_data = []
            for alert in recent_alerts:
                alerts_data.append({
                    'title': alert.title,
                    'type': alert.alert_type,
                    'status': alert.status,
                    'triggered_at': alert.triggered_at
                })

            credentials = CloudCredentials.objects.filter(user=request.user)
            is_mock_mode = any(
                (
                    (cred.additional_data or {}).get('is_mock') or
                    (cred.additional_data or {}).get('demo_mode') or
                    (cred.additional_data or {}).get('is_demo')
                )
                for cred in credentials
            )
            
            return Response({
                'total_cost': round(total_cost, 2),
                'clouds': clouds_data,
                'active_recommendations': active_recs,
                'recent_alerts': alerts_data,
                'clouds_connected': len(clouds_data),
                'is_mock_mode': is_mock_mode
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )