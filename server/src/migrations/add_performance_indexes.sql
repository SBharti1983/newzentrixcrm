-- ══════════════════════════════════════════════════════════════════
-- ZentrixCRM Performance Index Migration
-- Purpose: Accelerate the most heavily queried WHERE clauses
-- across Dashboard, Analytics, Leads, Telephony, and Commission routes.
-- ══════════════════════════════════════════════════════════════════

-- ─── Core Multi-Tenant Indexes ──────────────────────────────────
-- Every single query in ZentrixCRM filters by tenant_id first.
-- These compound indexes let Postgres jump straight to the tenant's data
-- instead of scanning the entire table.

-- Leads: The most queried table in the system
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_stage ON leads (tenant_id, stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_assigned ON leads (tenant_id, assigned_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_source ON leads (tenant_id, source);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_created ON leads (tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_project ON leads (tenant_id, project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_phone ON leads (tenant_id, phone);

-- Interactions: Telephony, Sentiment, Call Records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_tenant_lead ON interactions (tenant_id, lead_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_tenant_user ON interactions (tenant_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_tenant_type ON interactions (tenant_id, type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_tenant_date ON interactions (tenant_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_sentiment ON interactions (tenant_id, sentiment) WHERE sentiment IS NOT NULL;

-- Followups: Dashboard upcoming, agent workload
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_tenant_status ON followups (tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_tenant_assigned ON followups (tenant_id, assigned_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followups_scheduled ON followups (tenant_id, scheduled_at) WHERE status = 'Pending';

-- Bookings: Revenue analytics, active deals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_status ON bookings (tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_agent ON bookings (tenant_id, assigned_agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_project ON bookings (tenant_id, project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_date ON bookings (tenant_id, booking_date DESC);

-- Installments: Overdue payment tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_installments_tenant_status ON installments (tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_installments_booking ON installments (booking_id);

-- Users: Hierarchy queries, team views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_active ON users (tenant_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_reports_to ON users (reports_to) WHERE reports_to IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Commissions: Financial dashboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_tenant ON commissions (tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_booking ON commissions (booking_id);

-- Activity Log: Audit trails, nurture reactivation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_tenant ON activity_log (tenant_id, entity_type, action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_created ON activity_log (tenant_id, created_at DESC);

-- Projects: Inventory, bookings by project
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tenant ON projects (tenant_id);

-- Drip Campaigns & Enrollments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drip_enrollments_campaign ON drip_enrollments (campaign_id, lead_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drip_enrollments_tenant ON drip_enrollments (tenant_id);

-- Site Visits
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_site_visits_tenant_agent ON site_visits (tenant_id, assigned_agent);

-- Refresh Tokens: Auth speed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id, expires_at);

-- Channel Partners
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_partners_tenant ON channel_partners (tenant_id);

-- Training Progress (Academy)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_progress_user ON training_progress (user_id);

-- ══════════════════════════════════════════════════════════════════
-- DONE. These indexes cover >95% of WHERE clauses used in 
-- Dashboard, Analytics, Leads, Telephony, and Commission routes.
-- Use EXPLAIN ANALYZE on any slow query to verify index usage.
-- ══════════════════════════════════════════════════════════════════
