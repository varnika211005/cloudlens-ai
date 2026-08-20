"""
Database models for CloudLens AI
"""

from django.db import models
from django.contrib.auth.models import User
from cryptography.fernet import Fernet
import os
import json


class UserProfile(models.Model):
    """Extended user profile"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cloudlens_profile')
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    alert_email = models.EmailField(blank=True)
    alert_slack_webhook = models.URLField(blank=True)
    alert_whatsapp = models.CharField(max_length=15, blank=True)
    alert_threshold_percent = models.IntegerField(default=80)
    timezone = models.CharField(max_length=50, default='UTC')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"


class CloudCredentials(models.Model):
    """Store encrypted cloud API credentials"""
    
    CLOUD_PROVIDER_CHOICES = [
        ('AWS', 'Amazon Web Services'),
        ('AZURE', 'Microsoft Azure'),
        ('GCP', 'Google Cloud Platform'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cloud_credentials')
    cloud_provider = models.CharField(max_length=10, choices=CLOUD_PROVIDER_CHOICES)
    
    # Encrypted fields
    encrypted_key_1 = models.TextField()
    encrypted_key_2 = models.TextField()
    encrypted_key_3 = models.TextField(blank=True)
    additional_data = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    connection_error = models.TextField(blank=True)
    
    # Timestamps
    connected_at = models.DateTimeField(auto_now_add=True)
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('user', 'cloud_provider')
    
    def __str__(self):
        return f"{self.user.username} - {self.cloud_provider}"


class BillingCache(models.Model):
    """Cache billing data"""
    
    CLOUD_PROVIDER_CHOICES = [
        ('AWS', 'Amazon Web Services'),
        ('AZURE', 'Microsoft Azure'),
        ('GCP', 'Google Cloud Platform'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='billing_cache')
    cloud_provider = models.CharField(max_length=10, choices=CLOUD_PROVIDER_CHOICES)
    
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    daily_costs = models.JSONField(default=list)
    service_costs = models.JSONField(default=dict)
    anomalies = models.JSONField(default=list)
    
    fetched_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    is_fresh = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('user', 'cloud_provider')
    
    def __str__(self):
        return f"{self.user.username} - {self.cloud_provider}"


class DailyBillingRecord(models.Model):
    """Historical billing records"""
    
    CLOUD_PROVIDER_CHOICES = [
        ('AWS', 'Amazon Web Services'),
        ('AZURE', 'Microsoft Azure'),
        ('GCP', 'Google Cloud Platform'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_billings')
    cloud_provider = models.CharField(max_length=10, choices=CLOUD_PROVIDER_CHOICES)
    
    date = models.DateField()
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    service_costs = models.JSONField(default=dict)
    region_costs = models.JSONField(default=dict)
    
    is_anomaly = models.BooleanField(default=False)
    anomaly_score = models.FloatField(default=0)
    
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'cloud_provider', 'date')
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.username} - {self.cloud_provider} - {self.date}"


class Recommendation(models.Model):
    """AI-generated recommendations"""
    
    PRIORITY_CHOICES = [
        (1, 'Low'),
        (5, 'Medium'),
        (10, 'High'),
    ]
    
    CLOUD_CHOICES = [
        ('AWS', 'AWS'),
        ('AZURE', 'Azure'),
        ('GCP', 'GCP'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    cloud_provider = models.CharField(max_length=10, choices=CLOUD_CHOICES)
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    action = models.TextField()
    reason = models.TextField()
    
    estimated_monthly_savings = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_yearly_savings = models.DecimalField(max_digits=12, decimal_places=2)
    priority_score = models.IntegerField(choices=PRIORITY_CHOICES, default=5)
    
    is_active = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    actual_savings = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    generated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-priority_score', '-estimated_monthly_savings']
    
    def __str__(self):
        return f"{self.title} - Save ${self.estimated_monthly_savings}/mo"


class CostAlert(models.Model):
    """Anomaly and budget alerts"""
    
    ALERT_TYPE_CHOICES = [
        ('ANOMALY', 'Cost Anomaly'),
        ('BUDGET', 'Budget Threshold'),
        ('FORECAST', 'Forecast Warning'),
    ]
    
    STATUS_CHOICES = [
        ('TRIGGERED', 'Alert Triggered'),
        ('SENT', 'Alert Sent'),
        ('ACKNOWLEDGED', 'User Acknowledged'),
        ('RESOLVED', 'Resolved'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cost_alerts')
    alert_type = models.CharField(max_length=10, choices=ALERT_TYPE_CHOICES)
    cloud_provider = models.CharField(max_length=10)
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    cost_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cost_change_percent = models.FloatField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIGGERED')
    is_sent = models.BooleanField(default=False)
    
    sent_to_email = models.BooleanField(default=False)
    sent_to_slack = models.BooleanField(default=False)
    sent_to_whatsapp = models.BooleanField(default=False)
    
    triggered_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-triggered_at']
    
    def __str__(self):
        return f"{self.alert_type} - {self.title}"


class ChatMessage(models.Model):
    """Store chatbot conversation messages"""

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} - {self.role}: {self.content[:50]}"