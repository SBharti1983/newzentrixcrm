const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function enableLeadScoring() {
    try {
        const result = await pool.query(`
            UPDATE tenants 
            SET settings = jsonb_set(
                COALESCE(settings, '{}'::jsonb), 
                '{features}', 
                '{"ai_scoring": true, "marketing": true, "automations": true, "voice_telemetry": true, "custom_reports": true, "whatsapp": true}'::jsonb, 
                true
            )
            WHERE id = '1bbc00c0-766f-498d-9814-b9fdeb56b24d' 
            RETURNING id, settings
        `);
        console.log('Updated Tenant Features:', result.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

enableLeadScoring();
