/**
 * ZentrixCRM — Authentication & User Type Definitions
 */

export type UserRole = 
  | 'admin' 
  | 'sales_manager' 
  | 'team_leader' 
  | 'agent' 
  | 'customer' 
  | 'broker' 
  | 'superadmin';

export interface UserFeatures {
  whatsapp?: boolean;
  marketing?: boolean;
  voice_telemetry?: boolean;
  custom_reports?: boolean;
  automations?: boolean;
  ai_scoring?: boolean;
  [key: string]: boolean | undefined;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  department?: string;
  is_active?: boolean;
  last_login_at?: string;
  created_at?: string;
  reports_to?: string | null;
  telephony_agent_id?: string | null;
  tenantId?: string;
  tenant_id?: string;
  features?: UserFeatures;
  xp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, subdomain?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  canAccess: (path: string) => boolean;
  loginError: string;
  loading: boolean;
}

export interface RoleAccessRule {
  label: string;
  color: string;
  bg: string;
  pages: string[];
}

export type RoleAccessMap = Record<UserRole, RoleAccessRule>;
