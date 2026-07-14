/**
 * ZentrixCRM — Common/Shared Type Definitions
 */

export interface Notification {
  id: string;
  tenant_id: string;
  type: 'system' | 'lead' | 'followup' | 'booking' | 'whatsapp' | 'email' | 'call' | 'alert';
  title: string;
  message: string;
  read: boolean;
  from_user_id?: string;
  from_user_name?: string;
  to_user_id?: string;
  lead_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Automation {
  id: string;
  tenant_id: string;
  name: string;
  trigger: string;
  action: string;
  conditions?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  lead_id?: string;
  action: string;
  result: 'success' | 'failure';
  details?: string;
  created_at: string;
}

export interface Integration {
  id: string;
  tenant_id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface Template {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  content: string;
  variables?: string[];
  created_at: string;
}

export interface AcademyModule {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  type: 'video' | 'document' | 'quiz';
  url?: string;
  duration_minutes?: number;
  order_index?: number;
  created_at: string;
}

export interface BattleCard {
  id: string;
  tenant_id: string;
  title: string;
  category?: string;
  objection?: string;
  response?: string;
  tips?: string[];
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
  primary_color?: string;
  max_users: number;
  plan?: string;
  is_active: boolean;
  created_at: string;
}

export interface BrandingConfig {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
  favicon_url?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

/** Generic query params type for API calls */
export type QueryParams = Record<string, string | number | boolean | undefined>;
