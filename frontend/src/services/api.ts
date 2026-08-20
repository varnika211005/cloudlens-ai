import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

interface ApiError {
  error?: string;
  detail?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to all requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Token ${this.token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async signup(email: string, password: string, firstName: string = '', lastName: string = '') {
    const response = await this.client.post('/auth/signup/', {
      email,
      password,
      password_confirm: password,
      first_name: firstName,
      last_name: lastName,
    });
    this.setToken(response.data.token);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login/', {
      email,
      password,
    });
    this.setToken(response.data.token);
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    this.clearToken();
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile/');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/auth/profile/', data);
    return response.data;
  }

  // Cloud connections
  async connectCloud(provider: string, credentials: any) {
    const response = await this.client.post('/auth/connect/', {
      cloud_provider: provider,
      ...credentials,
    });
    return response.data;
  }

  async listClouds() {
    const response = await this.client.get('/auth/list/');
    return response.data;
  }

  async disconnectCloud(provider: string) {
    const response = await this.client.delete(`/auth/disconnect/${provider}/`);
    return response.data;
  }

  // Billing
  async fetchBilling(provider: string) {
    const response = await this.client.post(`/cloud/fetch/${provider}/`);
    return response.data;
  }

  async getBilling(provider: string) {
    const response = await this.client.get(`/cloud/billing/${provider}/`);
    return response.data;
  }

  async getBillingHistory(provider: string, days: number = 30) {
    const response = await this.client.get(`/cloud/history/${provider}/`, {
      params: { days },
    });
    return response.data;
  }

  async compareClouds() {
    const response = await this.client.get('/cloud/compare/');
    return response.data;
  }

  // Analytics
  async getCostSummary(provider: string, days: number = 30) {
    const response = await this.client.get(`/analytics/summary/${provider}/`, {
      params: { days },
    });
    return response.data;
  }

  async getRecommendations(provider?: string) {
    if (provider) {
      const response = await this.client.get(`/analytics/recommendations/${provider}/`);
      return response.data;
    }
    const response = await this.client.get('/analytics/recommendations/');
    return response.data;
  }

  async generateRecommendations(provider: string) {
    const response = await this.client.post(`/analytics/recommendations/${provider}/`);
    return response.data;
  }

  async getDashboard() {
    const response = await this.client.get('/analytics/dashboard/');
    return response.data;
  }

  // Alerts
  async createAlertRule(data: any) {
    const response = await this.client.post('/alerts/rules/create/', data);
    return response.data;
  }

  async listAlertRules() {
    const response = await this.client.get('/alerts/rules/');
    return response.data;
  }

  async listAlertLogs(limit: number = 50) {
    const response = await this.client.get('/alerts/logs/', {
      params: { limit },
    });
    return response.data;
  }

  async testAnomaly(provider: string) {
    const response = await this.client.post(`/alerts/test-anomaly/${provider}/`);
    return response.data;
  }
  async changePassword(oldPassword: string, newPassword: string) {
  const response = await this.client.post('/auth/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return response.data;
}
// Chat with CloudLens AI
async chatWithAI(message: string) {
  const response = await this.client.post('/auth/chat/', {
    message,
  });
  return response.data;
}

// Get carbon footprint
  async getCarbonFootprint(provider: string, days: number = 30) {
  const response = await this.client.get('/billing/carbon/', {
    params: { provider, days },
  });
  return response.data;
}

  // Cloud optimization
  async simulateOptimization(baseMonthly: number, params: any) {
    const response = await this.client.post('/optimize/simulate/', {
      base_monthly_cost: baseMonthly,
      ...params,
    });
    return response.data;
  }

  async getOptimizationRegions(provider: string, currentRegion: string) {
    const response = await this.client.get('/optimize/regions/', {
      params: { provider, current_region: currentRegion },
    });
    return response.data;
  }

  async getOptimizationIdleResources(provider: string, type?: string) {
    const response = await this.client.get('/optimize/idle-resources/', {
      params: {
        provider,
        ...(type ? { resource_type: type } : {}),
      },
    });
    return response.data;
  }

  async generateOptimizationReport(type: string, start: string, end: string) {
    const response = await this.client.post('/optimize/reports/', {
      report_type: type,
      period_start: start,
      period_end: end,
    });
    return response.data;
  }

  async getOptimizationTags(provider: string) {
    const response = await this.client.get('/optimize/tags/', {
      params: { provider },
    });
    return response.data;
  }
  // Token management
  private setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

const apiClient = new ApiClient();

export const optimize = {
  simulate: (baseMonthly: number, params: any) => apiClient.simulateOptimization(baseMonthly, params),
  getRegions: (provider: string, currentRegion: string) =>
    apiClient.getOptimizationRegions(provider, currentRegion),
  getIdleResources: (provider: string, type?: string) =>
    apiClient.getOptimizationIdleResources(provider, type),
  generateReport: (type: string, start: string, end: string) =>
    apiClient.generateOptimizationReport(type, start, end),
  getTags: (provider: string) => apiClient.getOptimizationTags(provider),
};

export default apiClient;
