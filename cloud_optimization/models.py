"""
Cloud optimization models for cost analysis and recommendations.
"""

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CostSimulation(models.Model):
    """Store what-if cost simulations."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cost_simulations')
    name = models.CharField(max_length=200, default='Untitled Simulation')

    # Base metrics
    base_monthly_cost = models.DecimalField(max_digits=12, decimal_places=2)

    # Optimization parameters
    rightsizing_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    reserved_savings_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    spot_instances_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    # Results
    projected_monthly_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monthly_savings = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    yearly_savings = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.user.username}"

    def calculate_savings(self):
        """Calculate projected savings and persist simulation results."""
        hundred = Decimal('100')
        base = self.base_monthly_cost

        rightsizing_savings = base * (self.rightsizing_percent / hundred)
        reserved_savings = base * (self.reserved_savings_percent / hundred)
        spot_savings = base * (self.spot_instances_percent / hundred)

        total_savings = rightsizing_savings + reserved_savings + spot_savings
        projected_cost = max(base - total_savings, Decimal('0'))

        self.monthly_savings = total_savings
        self.yearly_savings = total_savings * Decimal('12')
        self.projected_monthly_cost = projected_cost
        self.save(update_fields=['monthly_savings', 'yearly_savings', 'projected_monthly_cost', 'updated_at'])

        return {
            'monthly_savings': total_savings,
            'yearly_savings': total_savings * Decimal('12'),
            'projected_cost': projected_cost,
        }


class RegionOptimization(models.Model):
    """Store region optimization recommendations."""

    CLOUD_PROVIDER_CHOICES = [
        ('AWS', 'AWS'),
        ('AZURE', 'Azure'),
        ('GCP', 'GCP'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='region_optimizations')
    cloud_provider = models.CharField(max_length=20, choices=CLOUD_PROVIDER_CHOICES, default='AWS')
    current_region = models.CharField(max_length=50)
    recommended_region = models.CharField(max_length=50)

    current_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2)
    recommended_monthly_cost = models.DecimalField(max_digits=10, decimal_places=2)
    monthly_savings = models.DecimalField(max_digits=10, decimal_places=2)

    carbon_profile = models.CharField(
        max_length=20,
        choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')],
        default='Medium',
    )

    latency_impact = models.CharField(max_length=20, default='minimal')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-monthly_savings']

    def __str__(self):
        return f"{self.current_region} → {self.recommended_region}"


class IdleResource(models.Model):
    """Track idle/unused cloud resources."""

    RESOURCE_TYPE_CHOICES = [
        ('EC2', 'EC2 Instance'),
        ('RDS', 'RDS Database'),
        ('Storage', 'Storage Volume'),
        ('Lambda', 'Lambda Function'),
        ('ELB', 'Load Balancer'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='idle_resources')
    resource_id = models.CharField(max_length=100)
    resource_name = models.CharField(max_length=200)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES)

    cloud_provider = models.CharField(max_length=20)
    region = models.CharField(max_length=50)

    monthly_cost = models.DecimalField(max_digits=10, decimal_places=2)
    idle_duration_days = models.IntegerField(validators=[MinValueValidator(0)])

    cpu_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    network_mb_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_dismissed = models.BooleanField(default=False)

    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-monthly_cost']

    def __str__(self):
        return f"{self.resource_name} ({self.resource_type})"


class CostReport(models.Model):
    """Store generated cost reports."""

    REPORT_TYPE_CHOICES = [
        ('DAILY', 'Daily Report'),
        ('WEEKLY', 'Weekly Report'),
        ('MONTHLY', 'Monthly Report'),
        ('CUSTOM', 'Custom Report'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('GENERATING', 'Generating'),
        ('READY', 'Ready'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cost_reports')

    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Report data
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    service_breakdown = models.JSONField(default=dict, blank=True)
    region_breakdown = models.JSONField(default=dict, blank=True)
    tag_breakdown = models.JSONField(default=dict, blank=True)

    # File storage
    file_path = models.CharField(max_length=500, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    generated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.report_type} - {self.period_start} to {self.period_end}"


class TagCostGroup(models.Model):
    """Store tag-based cost allocations."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tag_cost_groups')

    tag_key = models.CharField(max_length=100)
    tag_value = models.CharField(max_length=200)

    cloud_provider = models.CharField(max_length=20)

    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    resource_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    # Service breakdown
    services = models.JSONField(default=dict, blank=True)

    # Resources tagged
    resources = models.JSONField(default=list, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-total_cost']
        unique_together = ('user', 'tag_key', 'tag_value', 'cloud_provider')

    def __str__(self):
        return f"{self.tag_key}={self.tag_value} (${self.total_cost})"
