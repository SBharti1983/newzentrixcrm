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
export interface TeamLeaderStats {
  leads: {
    active_leads: number;
    total?: number;
    [key: string]: any;
  };
  bookings: {
    total: number;
    total_value: number;
    [key: string]: any;
  };
  members: MemberPerformance[];
  telephony_stats?: {
    calls_today: number;
    [key: string]: any;
  };
  site_visits?: number;
  trends?: Array<{
    name: string;
    leads: string | number;
  }>;
  active_deals?: Array<{
    project_name: string;
    agent_name: string;
    status: string;
    total_amount: number | string;
  }>;
  upcoming_followups?: Array<{
    id: string | number;
    scheduled_at: string;
    type: string;
    agent_name: string;
    lead_name: string;
  }>;
}

export interface MemberPerformance {
  id: string;
  name: string;
  total_value: number;
  bookings: number;
  leads?: number;
}

export interface Lead {
  id: string | number;
  name: string;
  email?: string;
  phone: string;
  status: string;
  stage: string;
  source: string;
  project_name?: string;
  property_type?: string;
  score?: number;
  last_contact_at?: string;
  nurture_due_at?: string;
  created_at?: string;
  updated_at?: string;
  agent_name?: string;
  assigned_to?: string;
  budget_min?: number;
  budget_max?: number;
  nurture_reason?: string;
  reconnect_date?: string;
  [key: string]: any;
}

export interface Interaction {
  id: string | number;
  lead_id: string | number;
  type: string;
  note: string;
  date: string;
  agent_name?: string;
}

