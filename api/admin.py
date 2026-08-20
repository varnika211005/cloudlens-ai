from django.contrib import admin
from .models import UserProfile, CloudCredentials, BillingCache, DailyBillingRecord, Recommendation, CostAlert


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'monthly_budget', 'currency', 'timezone', 'created_at')
    list_filter = ('currency', 'timezone', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('User Info', {'fields': ('user',)}),
        ('Budget Settings', {'fields': ('monthly_budget', 'currency', 'alert_threshold_percent')}),
        ('Notifications', {'fields': ('alert_email', 'alert_slack_webhook', 'alert_whatsapp')}),
        ('Settings', {'fields': ('timezone',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(CloudCredentials)
class CloudCredentialsAdmin(admin.ModelAdmin):
    list_display = ('user', 'cloud_provider', 'is_active', 'is_verified', 'connected_at')
    list_filter = ('cloud_provider', 'is_active', 'is_verified', 'connected_at')
    search_fields = ('user__username', 'cloud_provider')
    readonly_fields = ('connected_at', 'last_tested_at', 'last_used_at')
    fieldsets = (
        ('Connection Info', {'fields': ('user', 'cloud_provider')}),
        ('Status', {'fields': ('is_active', 'is_verified', 'connection_error')}),
        ('Timestamps', {'fields': ('connected_at', 'last_tested_at', 'last_used_at'), 'classes': ('collapse',)}),
    )


@admin.register(BillingCache)
class BillingCacheAdmin(admin.ModelAdmin):
    list_display = ('user', 'cloud_provider', 'total_cost', 'is_fresh', 'fetched_at')
    list_filter = ('cloud_provider', 'is_fresh', 'fetched_at')
    search_fields = ('user__username', 'cloud_provider')
    readonly_fields = ('fetched_at', 'expires_at')


@admin.register(DailyBillingRecord)
class DailyBillingRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'cloud_provider', 'date', 'total_cost', 'is_anomaly')
    list_filter = ('cloud_provider', 'date', 'is_anomaly')
    search_fields = ('user__username', 'cloud_provider')


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'cloud_provider', 'estimated_monthly_savings', 'priority_score', 'is_completed')
    list_filter = ('cloud_provider', 'is_completed', 'generated_at')
    search_fields = ('user__username', 'title', 'description')


@admin.register(CostAlert)
class CostAlertAdmin(admin.ModelAdmin):
    list_display = ('user', 'alert_type', 'title', 'status', 'triggered_at')
    list_filter = ('alert_type', 'status', 'triggered_at')
    search_fields = ('user__username', 'title')
