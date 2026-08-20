"""
Alert models for cost anomalies and budget thresholds
"""

from django.db import models
from django.contrib.auth.models import User


class AlertRule(models.Model):
    """User-defined alert rules"""
    
    ALERT_TYPE_CHOICES = [
        ('ANOMALY', 'Cost Anomaly'),
        ('BUDGET', 'Budget Threshold'),
        ('FORECAST', 'Forecast Warning'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_rules')
    name = models.CharField(max_length=100)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    cloud_provider = models.CharField(max_length=10)
    
    # Conditions
    threshold_value = models.DecimalField(max_digits=10, decimal_places=2)
    threshold_unit = models.CharField(max_length=20, default='USD')  # USD, percentage
    
    # Notification methods
    notify_email = models.BooleanField(default=True)
    notify_slack = models.BooleanField(default=False)
    notify_whatsapp = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.alert_type}"


class AlertLog(models.Model):
    """Log of all alerts triggered"""
    
    STATUS_CHOICES = [
        ('TRIGGERED', 'Triggered'),
        ('SENT', 'Sent'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_logs')
    rule = models.ForeignKey(AlertRule, on_delete=models.SET_NULL, null=True, related_name='logs')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    alert_type = models.CharField(max_length=20)
    cloud_provider = models.CharField(max_length=10)
    
    triggered_value = models.DecimalField(max_digits=10, decimal_places=2)
    threshold_value = models.DecimalField(max_digits=10, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIGGERED')
    
    # Notification status
    email_sent = models.BooleanField(default=False)
    slack_sent = models.BooleanField(default=False)
    whatsapp_sent = models.BooleanField(default=False)
    
    # Timestamps
    triggered_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-triggered_at']
    
    def __str__(self):
        return f"{self.alert_type} - {self.title}"