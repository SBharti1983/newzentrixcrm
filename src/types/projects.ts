/**
 * ZentrixCRM — Project, Inventory, Booking & Customer Type Definitions
 */

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  location?: string;
  type?: string;
  status?: 'active' | 'completed' | 'upcoming';
  total_units?: number;
  available_units?: number;
  price_range_min?: number;
  price_range_max?: number;
  amenities?: string[];
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface InventoryUnit {
  id: string;
  project_id: string;
  unit_number: string;
  type: string;
  floor?: number;
  area_sqft?: number;
  price?: number;
  status: 'available' | 'booked' | 'sold' | 'blocked';
  facing?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  lead_id: string;
  lead_name?: string;
  project_id: string;
  project_name?: string;
  unit_id?: string;
  unit_number?: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  booking_date: string;
  installments?: Installment[];
  created_at: string;
}

export interface Installment {
  id: string;
  booking_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_id?: string;
  booking_ids?: string[];
  created_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  lead_name?: string;
  project_id?: string;
  project_name?: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  assigned_to?: string;
  created_at: string;
}

export interface ChannelPartner {
  id: string;
  tenant_id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  rera_number?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive';
  total_referrals?: number;
  total_conversions?: number;
  created_at: string;
}

export interface Commission {
  id: string;
  booking_id: string;
  partner_id?: string;
  agent_id?: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  created_at: string;
}
