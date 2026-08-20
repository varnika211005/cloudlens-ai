export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface CloudCredential {
  id: number;
  cloud_provider: string;
  cloud_provider_display: string;
  is_active: boolean;
  is_verified: boolean;
  connected_at: string;
  last_used_at: string;
  is_mock_mode?: boolean;
  demo_mode?: boolean;
  is_demo?: boolean;
  additional_data?: {
    is_mock?: boolean;
    demo_mode?: boolean;
    is_demo?: boolean;
    [key: string]: any;
  };
}

export interface BillingData {
  provider: string;
  total_cost: number;
  daily_costs: Array<{
    date: string;
    total: number;
    services: Record<string, number>;
  }>;
  service_costs: Record<string, number>;
  is_fresh: boolean;
}

export interface AlertRule {
  id: number;
  name: string;
  alert_type: string;
  cloud_provider: string;
  threshold_value: number;
  is_active: boolean;
}

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  action: string;
  cloud_provider: string;
  estimated_monthly_savings: number;
  estimated_yearly_savings?: number;  // Add this as optional
  priority_score: number;
}

export interface DashboardData {
  total_cost: number;
  clouds: Array<{
    provider: string;
    total_cost: number;
    is_fresh: boolean;
    top_services: Array<[string, number]>;
  }>;
  active_recommendations: number;
  recent_alerts: Array<{
    title: string;
    type: string;
    status: string;
    triggered_at: string;
  }>;
  clouds_connected: number;
}
