/**
 * ZentrixCRM — API Client Type Definitions
 */

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
}

export interface ApiError {
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardData {
  total_leads: number;
  new_leads: number;
  active_leads: number;
  converted_leads: number;
  total_revenue: number;
  conversion_rate: number;
  pipeline_value: number;
  followups_today: number;
  calls_today: number;
  site_visits_today: number;
  [key: string]: unknown;
}

export interface AnalyticsData {
  lead_sources: Array<{ source: string; count: number }>;
  lead_stages: Array<{ status: string; count: number }>;
  monthly_leads: Array<{ month: string; count: number }>;
  agent_performance: Array<{ 
    id: string; 
    name: string; 
    leads: number; 
    conversions: number; 
    revenue: number 
  }>;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: 'ok' | 'partial_error';
  services: {
    db: boolean;
    redis: boolean;
  };
  environment: string;
  timestamp: string;
  db_error?: string;
  redis_error?: string;
}
