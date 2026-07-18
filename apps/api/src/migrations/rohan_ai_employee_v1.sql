-- ═══════════════════════════════════════════════════════════════════
-- Rohan AI Digital Employee — Schema Migration v1
-- Creates tables for persona, conversation memory, and reasoning tracks
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. AI Employee Personas ─────────────────────────────────────────
-- Defines the identity, personality, voice config, and boundaries
-- for an AI digital employee (e.g., "Rohan Mishra, Senior Sales Associate")
CREATE TABLE IF NOT EXISTS ai_employee_personas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_name   VARCHAR(100) NOT NULL DEFAULT 'Rohan Mishra',
    employee_code   VARCHAR(50)  NOT NULL DEFAULT 'ZEN-AI-001',
    role            VARCHAR(100) NOT NULL DEFAULT 'Senior Sales Associate',
    avatar_url      TEXT,
    persona_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
    voice_config    JSONB NOT NULL DEFAULT '{}'::jsonb,
    knowledge_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active persona per tenant (enforced by partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_persona_active_per_tenant
    ON ai_employee_personas (tenant_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_persona_tenant ON ai_employee_personas(tenant_id);

-- ── 2. AI Conversation Memory (Working Memory) ────────────────────
-- Stores per-lead conversation state that persists across channels
-- and sessions. This is Rohan's "what I remember about this lead" table.
CREATE TABLE IF NOT EXISTS ai_conversation_memory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    persona_id      UUID NOT NULL REFERENCES ai_employee_personas(id) ON DELETE CASCADE,
    lead_id         UUID,  -- nullable: some conversations may not have a lead yet
    channel         VARCHAR(20) NOT NULL,  -- 'voice' | 'whatsapp' | 'outbound'
    conversation_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Tracks: current_goal, turn_count, language_detected, emotion_trend,
    --         missing_info, objections_raised, documents_shared, next_action
    last_reasoning  JSONB,  -- Track B's most recent CoT output (deferred reasoning)
    last_reasoning_at TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,  -- short-term memory TTL (e.g., 24h after last activity)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_tenant_lead ON ai_conversation_memory(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_persona ON ai_conversation_memory(persona_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_expires ON ai_conversation_memory(expires_at) WHERE expires_at IS NOT NULL;

-- ── 3. AI Reasoning Log (Track B Audit Trail) ──────────────────────
-- Every background CoT reasoning cycle is logged for debugging,
-- analytics, and feeding insights back into the vector DB later.
CREATE TABLE IF NOT EXISTS ai_reasoning_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    persona_id      UUID NOT NULL REFERENCES ai_employee_personas(id) ON DELETE CASCADE,
    lead_id         UUID,
    memory_id       UUID REFERENCES ai_conversation_memory(id) ON DELETE SET NULL,
    turn_number     INTEGER NOT NULL DEFAULT 0,
    channel         VARCHAR(20) NOT NULL,
    user_input      TEXT,
    reasoning_output JSONB NOT NULL,  -- full CoT JSON: intent, emotion, strategy, etc.
    response_given  TEXT,             -- what Track A actually said (for comparison)
    latency_ms      INTEGER,          -- Track A response latency
    reasoning_ms    INTEGER,          -- Track B reasoning latency
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reasoning_tenant_lead ON ai_reasoning_log(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_persona ON ai_reasoning_log(persona_id);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_created ON ai_reasoning_log(created_at DESC);

-- ── 4. AI Escalation Events ───────────────────────────────────────
-- When Rohan decides to escalate to a human, the event is recorded here
-- and the existing notification system picks it up.
CREATE TABLE IF NOT EXISTS ai_escalation_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    persona_id      UUID NOT NULL REFERENCES ai_employee_personas(id) ON DELETE CASCADE,
    lead_id         UUID,
    memory_id       UUID REFERENCES ai_conversation_memory(id) ON DELETE SET NULL,
    escalation_type VARCHAR(50) NOT NULL,  -- 'discount' | 'legal' | 'negative_sentiment' | 'booking_intent' | 'confusion'
    trigger_reason  TEXT NOT NULL,
    suggested_role  VARCHAR(100),  -- 'sales_manager' | 'legal_team' | 'booking_team'
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'notified' | 'resolved' | 'dismissed'
    resolved_by     UUID,  -- user_id of the human who handled it
    resolved_at     TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_escalation_tenant_status ON ai_escalation_events(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_escalation_lead ON ai_escalation_events(lead_id);

-- ── 5. AI Employee Metrics (Daily Rollup) ─────────────────────────
-- Aggregated daily performance metrics so Rohan appears on the
-- leaderboard alongside human agents.
CREATE TABLE IF NOT EXISTS ai_employee_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    persona_id      UUID NOT NULL REFERENCES ai_employee_personas(id) ON DELETE CASCADE,
    metric_date     DATE NOT NULL,
    calls_inbound   INTEGER NOT NULL DEFAULT 0,
    calls_outbound  INTEGER NOT NULL DEFAULT 0,
    whatsapp_msgs   INTEGER NOT NULL DEFAULT 0,
    escalations     INTEGER NOT NULL DEFAULT 0,
    leads_qualified INTEGER NOT NULL DEFAULT 0,
    site_visits_booked INTEGER NOT NULL DEFAULT 0,
    avg_call_duration_sec INTEGER NOT NULL DEFAULT 0,
    avg_response_latency_ms INTEGER NOT NULL DEFAULT 0,
    csat_score      DECIMAL(3,2),  -- 0.00 to 5.00
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, persona_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_tenant_date ON ai_employee_metrics(tenant_id, metric_date);

-- ── 6. Seed Default Rohan Persona ─────────────────────────────────
-- Inserts a default Rohan persona for the first tenant if none exists.
-- This can be customized per-tenant via the admin UI later.
INSERT INTO ai_employee_personas (
    tenant_id,
    employee_name,
    employee_code,
    role,
    persona_config,
    voice_config,
    knowledge_scope,
    escalation_rules
)
SELECT
    t.id,
    'Rohan Mishra',
    'ZEN-AI-001',
    'rohan',
    -- persona_config
    '{
        "personality": "warm, professional, patient",
        "tone": "conversational, respectful",
        "language_style": "natural code-mix (Hindi-English)",
        "greeting_style": "Namaste {name} ji, main Rohan hoon Zentrix Realty se",
        "patience_level": "high",
        "humor": "light, contextual",
        "filler_words": ["hmm", "theek hai", "samajh gaya", "ek second"]
    }'::jsonb,
    -- voice_config
    '{
        "hindi_voice": "sarvam-mukesh",
        "english_voice": "cartesia-neutral-male",
        "code_mix_voice": "sarvam-mukesh",
        "speed": 1.0,
        "pitch": 1.0
    }'::jsonb,
    -- knowledge_scope
    '{
        "projects": "all_active",
        "faqs": "pricing, payment_plans, rera, site_visit, amenities",
        "inventory": "live_availability",
        "boundaries": "never_commit_discounts, never_give_legal_advice"
    }'::jsonb,
    -- escalation_rules
    '{
        "discount_request": {"action": "notify", "role": "sales_manager"},
        "legal_question": {"action": "notify", "role": "legal_team"},
        "negative_sentiment_below": -0.6,
        "booking_intent": {"action": "warm_transfer", "role": "booking_team"},
        "conversation_confusion": {"action": "human_takeover"},
        "max_conversation_minutes": 8
    }'::jsonb
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM ai_employee_personas p WHERE p.tenant_id = t.id AND p.is_active = TRUE
)
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════
-- End of Migration
-- ═══════════════════════════════════════════════════════════════════
