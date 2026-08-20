from django.contrib import admin

from .models import CostReport, CostSimulation, IdleResource, RegionOptimization, TagCostGroup


@admin.register(CostSimulation)
class CostSimulationAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'base_monthly_cost', 'projected_monthly_cost', 'monthly_savings', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RegionOptimization)
class RegionOptimizationAdmin(admin.ModelAdmin):
    list_display = ('user', 'current_region', 'recommended_region', 'monthly_savings', 'carbon_profile')
    list_filter = ('cloud_provider', 'carbon_profile')
    search_fields = ('user__username', 'current_region', 'recommended_region')


@admin.register(IdleResource)
class IdleResourceAdmin(admin.ModelAdmin):
    list_display = ('resource_name', 'resource_type', 'user', 'monthly_cost', 'idle_duration_days')
    list_filter = ('resource_type', 'cloud_provider', 'is_dismissed')
    search_fields = ('user__username', 'resource_name', 'resource_id')


@admin.register(CostReport)
class CostReportAdmin(admin.ModelAdmin):
    list_display = ('user', 'report_type', 'period_start', 'period_end', 'status', 'total_cost')
    list_filter = ('report_type', 'status', 'created_at')
    search_fields = ('user__username',)
    readonly_fields = ('created_at', 'generated_at')


@admin.register(TagCostGroup)
class TagCostGroupAdmin(admin.ModelAdmin):
    list_display = ('tag_key', 'tag_value', 'user', 'cloud_provider', 'total_cost', 'resource_count')
    list_filter = ('cloud_provider', 'tag_key')
    search_fields = ('user__username', 'tag_key', 'tag_value')
