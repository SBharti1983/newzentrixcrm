const pool = require('./pool');

async function upgrade() {
    console.log('🔄 Upgrading leads table for Channel Partner support...');
    try {
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS channel_partner_id UUID REFERENCES channel_partners(id) ON DELETE SET NULL;
        `);
        console.log('✅ Added channel_partner_id to leads table.');

        await pool.query(`
            ALTER TABLE channel_partners
            ADD COLUMN IF NOT EXISTS contact_person VARCHAR(200),
            ADD COLUMN IF NOT EXISTS rera_no VARCHAR(100),
            ADD COLUMN IF NOT EXISTS assigned_projects JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Firm';
        `);
        console.log('✅ Added contact_person, rera_no, assigned_projects, type to channel_partners table.');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_leads_channel_partner ON leads(channel_partner_id);
        `);
        console.log('✅ Created index on channel_partner_id.');

    } catch (err) {
        console.error('❌ Upgrade failed:', err);
    } finally {
        process.exit();
    }
}

upgrade();
