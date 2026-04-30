const pool = require('./pool');

const SCHEMA = `
-- ═══════════════════════════════════════════════════════════════════
--  INTEGRATIONS (external lead sources)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS integrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,   -- whatsapp | facebook | instagram | google_ads
    api_key         TEXT,
    api_secret      TEXT,
    webhook_url_key UUID DEFAULT uuid_generate_v4(), -- unique key for the public webhook URL
    is_active       BOOLEAN DEFAULT TRUE,
    config          JSONB DEFAULT '{}',      -- stores Page IDs, WABA IDs, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS incoming_leads_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,
    payload         JSONB,
    status          VARCHAR(30) DEFAULT 'received', -- received | processed | error
    error_message   TEXT,
    lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incoming_leads_tenant ON incoming_leads_log(tenant_id);
`;

async function migrateIntegrations() {
    try {
        console.log('🔄 Running Integrations Migration...');
        await pool.query(SCHEMA);
        console.log('✅ Integrations tables created!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }
}

if (require.main === module) {
    migrateIntegrations().then(() => process.exit());
}

module.exports = migrateIntegrations;
