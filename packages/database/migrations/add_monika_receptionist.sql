-- ═══════════════════════════════════════════════════════════════════
-- Monika AI Digital Receptionist — Schema Migration v1
-- Creates the bookings table for meetings & site visits scheduled by Monika.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Receptionist Bookings (Meetings + Site Visits) ───────────────
-- Every meeting / site visit Monika schedules lands here. Reused by the
-- MonikaSchedulingService inside apps/digital-employee.
CREATE TABLE IF NOT EXISTS ai_receptionist_bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    persona_id          UUID NOT NULL REFERENCES ai_employee_personas(id) ON DELETE CASCADE,
    lead_id             UUID,  -- nullable: walk-in callers may not have a lead yet
    caller_name         VARCHAR(200) NOT NULL,
    caller_phone        VARCHAR(30) NOT NULL,
    meeting_type        VARCHAR(20) NOT NULL DEFAULT 'meeting',  -- 'meeting' | 'site_visit'
    scheduled_at        TIMESTAMPTZ,
    duration_minutes    INTEGER NOT NULL DEFAULT 30,
    project_id          UUID,
    project_name        VARCHAR(200),
    with_party          VARCHAR(50),  -- 'surendra' | 'rohan' | 'neha' | 'voicemail'
    with_party_user_id  UUID,         -- human user id when with_party = surendra
    status              VARCHAR(20) NOT NULL DEFAULT 'proposed',  -- proposed | confirmed | cancelled | completed | no_show
    note                TEXT,
    created_by          VARCHAR(20) NOT NULL DEFAULT 'monika',  -- 'monika' | 'human'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receptionist_bookings_tenant
    ON ai_receptionist_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receptionist_bookings_caller_phone
    ON ai_receptionist_bookings(caller_phone);
CREATE INDEX IF NOT EXISTS idx_receptionist_bookings_lead
    ON ai_receptionist_bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_receptionist_bookings_party_slot
    ON ai_receptionist_bookings(tenant_id, with_party, scheduled_at)
    WHERE status IN ('proposed', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_receptionist_bookings_upcoming
    ON ai_receptionist_bookings(scheduled_at)
    WHERE status IN ('proposed', 'confirmed');

-- ── 2. Site-visit-specific columns (nullable, only for site visits) ─
ALTER TABLE ai_receptionist_bookings
    ADD COLUMN IF NOT EXISTS number_of_visitors INTEGER,
    ADD COLUMN IF NOT EXISTS pickup_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pickup_location TEXT;

-- ── 3. updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_receptionist_bookings_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receptionist_bookings_updated_at ON ai_receptionist_bookings;
CREATE TRIGGER trg_receptionist_bookings_updated_at
    BEFORE UPDATE ON ai_receptionist_bookings
    FOR EACH ROW
    EXECUTE FUNCTION trg_receptionist_bookings_set_updated_at();
