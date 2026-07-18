-- ═══════════════════════════════════════════════════════════════════
-- Neha AI Digital Accountant — Schema Migration v1
-- Creates the filing_tasks table for GST/ITR filings initiated by Neha
-- and seeds the Neha persona row in ai_employee_personas.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. AI Filing Tasks (GST / ITR) ───────────────────────────────────
-- Every GST/ITR filing workflow Neha initiates lands here. Reused by
-- the NehaCognitiveLoop inside apps/digital-employee.
CREATE TABLE IF NOT EXISTS ai_filing_tasks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    persona_id              UUID NOT NULL REFERENCES ai_employee_personas(id) ON DELETE CASCADE,
    customer_id             UUID,   -- nullable: caller may not be in customers table yet
    lead_id                 UUID,   -- nullable: fallback link to leads table
    filing_type             VARCHAR(10) NOT NULL,  -- 'gst' | 'itr'
    gst_return_type         VARCHAR(20),           -- 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' (gst only)
    period                  VARCHAR(30),           -- e.g. 'FY2024-25' or 'Jul-2025'
    status                  VARCHAR(30) NOT NULL DEFAULT 'documents_requested',
    -- draft | documents_requested | documents_received | prepared |
    -- pending_authorization | filed | rejected | cancelled
    required_documents      JSONB NOT NULL DEFAULT '[]'::jsonb,
    collected_documents     JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes                   TEXT,
    assigned_to_user_id     UUID,   -- human staff assigned to finalize (e.g. Surendra)
    filed_at                TIMESTAMPTZ,
    filing_reference        VARCHAR(200),  -- ARN / acknowledgement number once filed
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_tasks_tenant
    ON ai_filing_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_filing_tasks_customer
    ON ai_filing_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_filing_tasks_lead
    ON ai_filing_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_filing_tasks_status
    ON ai_filing_tasks(tenant_id, status)
    WHERE status NOT IN ('filed', 'cancelled', 'rejected');
CREATE INDEX IF NOT EXISTS idx_filing_tasks_persona
    ON ai_filing_tasks(persona_id);

-- ── 2. updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_filing_tasks_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_filing_tasks_updated_at ON ai_filing_tasks;
CREATE TRIGGER trg_filing_tasks_updated_at
    BEFORE UPDATE ON ai_filing_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trg_filing_tasks_set_updated_at();

-- ── 3. Seed Neha Persona ────────────────────────────────────────────
-- Idempotently refresh the Neha accountant persona config.
-- The Neha row is expected to already exist (seeded by the base schema as
-- role='neha'). We UPDATE in place so re-running this migration is safe and
-- we never insert a duplicate persona. If the row is missing this block is
-- a no-op; create it via the application seed instead.
UPDATE ai_employee_personas
SET
    persona_config = '{
        "tone": "professional, calm, reassuring",
        "personality": "meticulous, patient, trustworthy, detail-oriented",
        "languages": ["hinglish", "english", "hindi"],
        "default_language": "hinglish",
        "greeting_style": "warm_professional",
        "filler_words": ["ji", "bilkul", "ek second", "theek hai"],
        "boundaries": [
            "no legal advice",
            "no audit opinions",
            "no fee waivers without manager approval",
            "never invent figures or filing deadlines"
        ]
    }'::jsonb,
    voice_config = '{
        "hinglish": {"voice_id": "neha-hinglish", "speed": 1.0, "pitch": 1.0},
        "english":  {"voice_id": "neha-english",  "speed": 1.0, "pitch": 1.0},
        "hindi":    {"voice_id": "neha-hindi",    "speed": 0.95, "pitch": 1.0}
    }'::jsonb,
    knowledge_scope = '{
        "domains": ["gst", "itr", "invoices", "payments", "tds", "bookkeeping"],
        "gst_return_types": ["GSTR-1", "GSTR-3B", "GSTR-9"],
        "itr_forms": ["ITR-1", "ITR-2", "ITR-3", "ITR-4"],
        "filing_deadlines": {
            "GSTR-1": "11th of following month",
            "GSTR-3B": "20th of following month",
            "GSTR-9": "31st December of following FY",
            "ITR": "31st July (non-audit), 31st October (audit)"
        }
    }'::jsonb,
    escalation_rules = '{
        "rules": [
            {
                "trigger": "caller_requests_human",
                "action": "handoff_to_surendra",
                "priority": 1
            },
            {
                "trigger": "legal_or_audit_query",
                "action": "handoff_to_surendra",
                "priority": 1
            },
            {
                "trigger": "complaint",
                "action": "handoff_to_surendra",
                "priority": 2
            },
            {
                "trigger": "fee_waiver_request",
                "action": "handoff_to_surendra",
                "priority": 2
            },
            {
                "trigger": "negative_sentiment",
                "action": "handoff_to_surendra",
                "priority": 3
            },
            {
                "trigger": "filing_needs_authorization",
                "action": "handoff_to_surendra",
                "priority": 2
            }
        ],
        "handoff_target": "surendra",
        "max_turns_before_handoff": 12
    }'::jsonb,
    is_active = TRUE,
    updated_at = NOW()
WHERE role = 'neha';

-- ═══════════════════════════════════════════════════════════════════
-- End of Migration
-- ═══════════════════════════════════════════════════════════════════
