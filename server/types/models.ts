/**
 * ZentrixCRM — Server-side Model Type Definitions
 * Mirror of the PostgreSQL schema
 */

export interface DbUser {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'sales_manager' | 'team_leader' | 'agent' | 'customer' | 'broker' | 'superadmin';
  avatar?: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  last_login_at?: Date;
  reports_to?: string | null;
  telephony_agent_id?: string | null;
  xp?: number;
  created_at: Date;
  updated_at?: Date;
}

export interface DbTenant {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
  primary_color?: string;
  max_users: number;
  plan?: string;
  is_active: boolean;
  features?: Record<string, boolean>;
  created_at: Date;
}

export interface DbLead {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  project_id?: string;
  budget_min?: number;
  budget_max?: number;
  assigned_to?: string;
  notes?: string;
  tags?: string[];
  ai_score?: number;
  ai_summary?: string;
  ai_recommendation?: string;
  sentiment?: string;
  nurture_stage?: string;
  last_interaction_at?: Date;
  next_followup_at?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface DbProject {
  id: string;
  tenant_id: string;
  name: string;
  location?: string;
  type?: string;
  status?: string;
  total_units?: number;
  available_units?: number;
  price_range_min?: number;
  price_range_max?: number;
  amenities?: string[];
  description?: string;
  image_url?: string;
  created_at: Date;
}

export interface DbBooking {
  id: string;
  tenant_id: string;
  lead_id: string;
  project_id: string;
  unit_id?: string;
  amount: number;
  status: string;
  booking_date: Date;
  created_at: Date;
}

export interface DbNotification {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  from_user_id?: string;
  to_user_id?: string;
  lead_id?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface DbAuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: Date;
}
