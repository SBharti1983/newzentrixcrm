import { ReactNode } from 'react';

// ─── KPI Card Types ─────────────────────────────────────────────────
export interface KPIItem {
  label: string;
  val: string | number;
  change: string;
  isUp: boolean;
  color: string;
  iconBg: string;
  sparklineData: number[];
  icon: ReactNode;
  navigateTo?: string;
}

// ─── Revenue Source Types ───────────────────────────────────────────
export interface RevenueSource {
  name: string;
  value: number;
  amount: string;
  color: string;
}

// ─── Funnel Segment Types ───────────────────────────────────────────
export interface FunnelItem {
  label: string;
  count: number;
  percentage?: string;
  color: string;
  clipPath: string;
  width: string;
}

// ─── Team Member Types ──────────────────────────────────────────────
export interface TeamMember {
  name: string;
  leads: number;
  visits: number;
  bookings: number;
  conversion: string;
  revenue: string;
  sparklineData: number[];
  img: string;
}

// ─── Project Types ──────────────────────────────────────────────────
export interface ProjectItem {
  name: string;
  bookings: string;
  value: string;
  progress: number;
  color: string;
  img: string;
}

// ─── Activity Types ─────────────────────────────────────────────────
export interface ActivityItem {
  user: string;
  action: string;
  target: string;
  time: string;
  initials: string;
  color: string;
  bg: string;
}

// ─── Lead Analytics Types ───────────────────────────────────────────
export interface LeadDataItem {
  name: string;
  value: number;
  count?: number;
  percentage?: string;
  color: string;
}

// ─── Inventory Types ────────────────────────────────────────────────
export interface InventoryItem {
  name: string;
  sold: number;
  available: number;
  hold: number;
}

// ─── Target Types ───────────────────────────────────────────────────
export interface TargetData {
  achieved: number;
  target: number;
  remaining: number;
  percentage: number;
}

// ─── Task Types ─────────────────────────────────────────────────────
export interface TaskItem {
  count: number;
  label: string;
}

// ─── Shared Period Type ─────────────────────────────────────────────
export type PeriodValue =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'all_leads'
  | 'hot_leads';

export interface PeriodOption {
  value: PeriodValue;
  label: string;
}

// ─── Common Card Props ──────────────────────────────────────────────
export interface DashCardProps {
  isMobile: boolean;
}
