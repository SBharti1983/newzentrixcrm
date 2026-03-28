const pool = require('./pool');

const upgradeMarketingAnalytics = async () => {
    try {
        console.log('🔄 Upgrading marketing tables for analytics...');

        // 1. Add analytics columns to drip_steps for quick view
        await pool.query(`
            ALTER TABLE drip_steps
            ADD COLUMN IF NOT EXISTS sent_count_a INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS opens_count_a INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS clicks_count_a INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS sent_count_b INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS opens_count_b INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS clicks_count_b INTEGER DEFAULT 0;
        `);

        // 2. Create a detailed event log for marketing interactions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS drip_events (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
                step_id UUID NOT NULL REFERENCES drip_steps(id) ON DELETE CASCADE,
                lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                event_type VARCHAR(50) NOT NULL, -- sent | opened | clicked | bounced
                variant CHAR(1) DEFAULT 'A', -- A or B
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        console.log('✅ Marketing analytics infrastructure ready.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to upgrade marketing analytics:', err);
        process.exit(1);
    }
};

upgradeMarketingAnalytics();
