"""
Cloud optimization views for simulations and analysis.
"""

import logging
from decimal import Decimal, InvalidOperation

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import DailyBillingRecord
from .models import CostReport, CostSimulation, IdleResource, TagCostGroup

logger = logging.getLogger(__name__)


def _to_decimal(value, field_name):
    """Convert incoming numeric input to Decimal with clear validation errors."""
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None, f'Invalid value for {field_name}'
    if decimal_value < 0:
        return None, f'{field_name} must be non-negative'
    return decimal_value, None


class CostSimulationView(APIView):
    """What-if cost simulation."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Create cost simulation.
        POST /api/optimize/simulate/
        """
        try:
            base_cost, error = _to_decimal(request.data.get('base_monthly_cost'), 'base_monthly_cost')
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            rightsizing, error = _to_decimal(request.data.get('rightsizing_percent', 0), 'rightsizing_percent')
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            reserved, error = _to_decimal(request.data.get('reserved_savings_percent', 0), 'reserved_savings_percent')
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            spot, error = _to_decimal(request.data.get('spot_instances_percent', 0), 'spot_instances_percent')
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            for value, name in (
                (rightsizing, 'rightsizing_percent'),
                (reserved, 'reserved_savings_percent'),
                (spot, 'spot_instances_percent'),
            ):
                if value > 100:
                    return Response({'error': f'{name} cannot be greater than 100'}, status=status.HTTP_400_BAD_REQUEST)

            simulation = CostSimulation.objects.create(
                user=request.user,
                name=request.data.get('name') or 'Untitled Simulation',
                base_monthly_cost=base_cost,
                rightsizing_percent=rightsizing,
                reserved_savings_percent=reserved,
                spot_instances_percent=spot,
            )

            savings = simulation.calculate_savings()
            savings_percent = (savings['monthly_savings'] / base_cost * Decimal('100')) if base_cost > 0 else Decimal('0')

            return Response(
                {
                    'simulation_id': simulation.id,
                    'base_monthly_cost': float(simulation.base_monthly_cost),
                    'projected_cost': float(savings['projected_cost']),
                    'monthly_savings': float(savings['monthly_savings']),
                    'yearly_savings': float(savings['yearly_savings']),
                    'savings_percent': round(float(savings_percent), 2),
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception:
            logger.exception('Failed to create cost simulation')
            return Response({'error': 'Unable to create simulation'}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, simulation_id=None):
        """Get simulation by id or list all user simulations."""
        if simulation_id:
            try:
                sim = CostSimulation.objects.get(id=simulation_id, user=request.user)
            except CostSimulation.DoesNotExist:
                return Response({'error': 'Simulation not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response(
                {
                    'id': sim.id,
                    'name': sim.name,
                    'base_cost': float(sim.base_monthly_cost),
                    'projected_cost': float(sim.projected_monthly_cost or 0),
                    'monthly_savings': float(sim.monthly_savings or 0),
                    'yearly_savings': float(sim.yearly_savings or 0),
                    'created_at': sim.created_at,
                },
                status=status.HTTP_200_OK,
            )

        simulations = CostSimulation.objects.filter(user=request.user)
        data = [
            {
                'id': sim.id,
                'name': sim.name,
                'base_cost': float(sim.base_monthly_cost),
                'projected_cost': float(sim.projected_monthly_cost or 0),
                'monthly_savings': float(sim.monthly_savings or 0),
                'created_at': sim.created_at,
            }
            for sim in simulations
        ]
        return Response({'simulations': data, 'count': len(data)}, status=status.HTTP_200_OK)


class RegionAdvisorView(APIView):
    """Region optimization recommendations."""

    permission_classes = [IsAuthenticated]

    REGION_DATA = {
        'us-east-1': {'monthly_cost': 420, 'carbon_profile': 'Medium'},
        'us-west-2': {'monthly_cost': 395, 'carbon_profile': 'Low'},
        'eu-west-1': {'monthly_cost': 438, 'carbon_profile': 'Low'},
        'ap-south-1': {'monthly_cost': 465, 'carbon_profile': 'High'},
        'eu-north-1': {'monthly_cost': 384, 'carbon_profile': 'Low'},
    }

    def get(self, request):
        """
        Get region recommendations.
        GET /api/optimize/regions/?provider=AWS&current_region=us-east-1
        """
        provider = request.query_params.get('provider', 'AWS')
        current_region = request.query_params.get('current_region', 'us-east-1')

        current_entry = self.REGION_DATA.get(current_region, self.REGION_DATA['us-east-1'])
        current_cost = current_entry['monthly_cost']

        recommendations = []
        for region, values in self.REGION_DATA.items():
            if region == current_region:
                continue
            savings = current_cost - values['monthly_cost']
            if savings > 0:
                recommendations.append(
                    {
                        'region': region,
                        'monthly_cost': values['monthly_cost'],
                        'monthly_savings': savings,
                        'yearly_savings': savings * 12,
                        'carbon_profile': values['carbon_profile'],
                    }
                )

        recommendations.sort(key=lambda item: item['monthly_savings'], reverse=True)
        return Response(
            {
                'provider': provider,
                'current_region': current_region,
                'current_monthly_cost': current_cost,
                'recommendations': recommendations[:5],
            },
            status=status.HTTP_200_OK,
        )


class IdleResourcesView(APIView):
    """Detect and track idle resources."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get idle resources.
        GET /api/optimize/idle-resources/?provider=AWS&resource_type=EC2
        """
        provider = request.query_params.get('provider', 'AWS')
        resource_type = request.query_params.get('resource_type')

        resources = IdleResource.objects.filter(
            user=request.user,
            cloud_provider=provider,
            is_dismissed=False,
        )
        if resource_type:
            resources = resources.filter(resource_type=resource_type)
        resources = resources.order_by('-monthly_cost')

        data = [
            {
                'id': resource.id,
                'resource_id': resource.resource_id,
                'name': resource.resource_name,
                'type': resource.resource_type,
                'monthly_cost': float(resource.monthly_cost),
                'idle_days': resource.idle_duration_days,
                'cpu_percent': float(resource.cpu_percent),
                'network_usage': float(resource.network_mb_per_hour),
            }
            for resource in resources
        ]
        total_savings = sum(item['monthly_cost'] for item in data)

        return Response(
            {
                'resources': data,
                'count': len(data),
                'total_potential_savings': round(total_savings, 2),
                'yearly_potential_savings': round(total_savings * 12, 2),
            },
            status=status.HTTP_200_OK,
        )


class CostReportView(APIView):
    """Generate and manage cost reports."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Generate cost report.
        POST /api/optimize/reports/
        """
        report_type = request.data.get('report_type', 'MONTHLY')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        if not period_start or not period_end:
            return Response({'error': 'period_start and period_end are required'}, status=status.HTTP_400_BAD_REQUEST)

        report = CostReport.objects.create(
            user=request.user,
            report_type=report_type,
            period_start=period_start,
            period_end=period_end,
            status='GENERATING',
        )

        try:
            records = DailyBillingRecord.objects.filter(
                user=request.user,
                date__gte=period_start,
                date__lte=period_end,
            )
            totals = records.aggregate(total=Sum('total_cost'))
            total_cost = totals['total'] or Decimal('0')

            service_breakdown = {}
            region_breakdown = {}
            for record in records:
                for service, cost in (record.service_costs or {}).items():
                    service_breakdown[service] = round(service_breakdown.get(service, 0) + float(cost), 2)
                for region, cost in (record.region_costs or {}).items():
                    region_breakdown[region] = round(region_breakdown.get(region, 0) + float(cost), 2)

            report.total_cost = total_cost
            report.service_breakdown = service_breakdown
            report.region_breakdown = region_breakdown
            report.status = 'READY'
            report.generated_at = timezone.now()
            report.save()
        except Exception:
            logger.exception('Failed to generate cost report', extra={'report_id': report.id, 'user_id': request.user.id})
            report.status = 'FAILED'
            report.save(update_fields=['status'])

        response_data = {
            'report_id': report.id,
            'status': report.status,
            'total_cost': float(report.total_cost or 0),
            'generated_at': report.generated_at,
        }
        if report.status == 'FAILED':
            response_data['error'] = 'Failed to generate report'

        return Response(response_data, status=status.HTTP_201_CREATED)

    def get(self, request, report_id=None):
        """Get a report by id or list reports."""
        if report_id:
            try:
                report = CostReport.objects.get(id=report_id, user=request.user)
            except CostReport.DoesNotExist:
                return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response(
                {
                    'id': report.id,
                    'type': report.report_type,
                    'period': f"{report.period_start} to {report.period_end}",
                    'status': report.status,
                    'total_cost': float(report.total_cost or 0),
                    'generated_at': report.generated_at,
                },
                status=status.HTTP_200_OK,
            )

        reports = CostReport.objects.filter(user=request.user).order_by('-created_at')[:10]
        data = [
            {
                'id': report.id,
                'type': report.report_type,
                'period': f"{report.period_start} to {report.period_end}",
                'status': report.status,
                'total_cost': float(report.total_cost or 0),
            }
            for report in reports
        ]
        return Response({'reports': data, 'count': len(data)}, status=status.HTTP_200_OK)


class TagCostAllocationView(APIView):
    """View costs grouped by tags."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get tag-based cost allocation.
        GET /api/optimize/tags/?provider=AWS
        """
        provider = request.query_params.get('provider', 'AWS')
        groups = TagCostGroup.objects.filter(
            user=request.user,
            cloud_provider=provider,
        ).order_by('-total_cost')

        data = []
        total_cost = 0.0
        for group in groups:
            cost = float(group.total_cost)
            data.append(
                {
                    'tag_key': group.tag_key,
                    'tag_value': group.tag_value,
                    'cost': cost,
                    'resource_count': group.resource_count,
                    'services': group.services,
                }
            )
            total_cost += cost

        return Response(
            {
                'tag_groups': data,
                'total_cost': round(total_cost, 2),
                'count': len(data),
            },
            status=status.HTTP_200_OK,
        )
