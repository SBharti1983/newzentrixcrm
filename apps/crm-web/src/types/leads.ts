/**
 * ZentrixCRM — Lead, Interaction & Deal Type Definitions
 */

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'negotiation' 
  | 'won' 
  | 'lost' 
  | 'nurture'
  | 'site_visit_scheduled'
  | 'site_visit_done'
  | 'booking'
  | 'post_sale';

export type LeadSource = 
  | 'website' 
  | 'referral' 
  | 'walk_in' 
  | 'facebook' 
  | 'google' 
  | 'instagram'
  | 'housing'
  | '99acres'
  | 'magicbricks'
  | 'whatsapp'
  | 'manual'
  | 'import'
  | 'zapier'
  | string;

export type InteractionType = 
  | 'call' 
  | 'email' 
  | 'whatsapp' 
  | 'meeting' 
  | 'site_visit' 
  | 'note'
  | 'sms';

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  source?: LeadSource;
  project_id?: string;
  project_name?: string;
  budget_min?: number;
  budget_max?: number;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
  tags?: string[];
  ai_score?: number;
  ai_summary?: string;
  ai_recommendation?: string;
  sentiment?: string;
  nurture_stage?: string;
  last_interaction_at?: string;
  next_followup_at?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: InteractionType;
  notes?: string;
  outcome?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  sentiment?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
}

export interface Deal {
  id: string;
  lead_id: string;
  amount: number;
  stage?: string;
  expected_close_date?: string;
  notes?: string;
  created_at: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  lead_name?: string;
  type: string;
  scheduled_at: string;
  notes?: string;
  status: 'pending' | 'completed' | 'missed';
  created_at: string;
  assigned_to?: string;
}
