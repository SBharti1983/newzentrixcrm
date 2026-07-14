-- Lead Distribution & Round-Robin System
-- Allows for automated routing based on performance scores and availability

CREATE TABLE IF NOT EXISTS distribution_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strategy TEXT DEFAULT 'Performance-Weighted Round-Robin', -- Options: Round-Robin, Performance-Weighted, Least-Busy
    is_active BOOLEAN DEFAULT TRUE,
    last_assigned_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distribution_queue_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES distribution_queues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1, -- Can be adjusted based on seniority
    is_available BOOLEAN DEFAULT TRUE,
    last_assigned_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(queue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dist_queue_tenant ON distribution_queues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dist_members_queue ON distribution_queue_members(queue_id);
