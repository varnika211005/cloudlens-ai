from django.contrib import admin
from .models import AlertRule, AlertLog


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'alert_type', 'cloud_provider', 'threshold_value', 'is_active')
    list_filter = ('alert_type', 'cloud_provider', 'is_active', 'created_at')
    search_fields = ('user__username', 'name', 'cloud_provider')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Rule Info', {'fields': ('user', 'name', 'alert_type', 'cloud_provider')}),
        ('Threshold', {'fields': ('threshold_value', 'threshold_unit')}),
        ('Notifications', {'fields': ('notify_email', 'notify_slack', 'notify_whatsapp')}),
        ('Status', {'fields': ('is_active',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(AlertLog)
class AlertLogAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'alert_type', 'cloud_provider', 'status', 'triggered_at')
    list_filter = ('alert_type', 'cloud_provider', 'status', 'triggered_at')
    search_fields = ('user__username', 'title', 'description')
    readonly_fields = ('triggered_at', 'sent_at', 'acknowledged_at')
    fieldsets = (
        ('Alert Info', {'fields': ('user', 'rule', 'title', 'description')}),
        ('Details', {'fields': ('alert_type', 'cloud_provider', 'triggered_value', 'threshold_value')}),
        ('Status', {'fields': ('status', 'email_sent', 'slack_sent', 'whatsapp_sent')}),
        ('Timestamps', {'fields': ('triggered_at', 'sent_at', 'acknowledged_at'), 'classes': ('collapse',)}),
    )
