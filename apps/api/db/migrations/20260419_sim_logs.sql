-- Migration: Add Simulation Logs for Management Insights
CREATE TABLE IF NOT EXISTS simulation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    module_id UUID,
    persona TEXT,
    scenario_title TEXT,
    score INTEGER,
    grade TEXT,
    strengths TEXT[],
    weaknesses TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast reporting
CREATE INDEX IF NOT EXISTS idx_sim_reports_tenant ON simulation_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sim_reports_user ON simulation_reports(user_id);
