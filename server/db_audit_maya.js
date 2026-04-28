const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function audit() {
    try {
        console.log('--- AUDITING TENANT: mayainfratech.in ---');
        
        // 1. Get User and Tenant
        const userRes = await pool.query('SELECT id, tenant_id, role, name FROM users WHERE email = $1', ['admin@mayainfratech.in']);
        if (userRes.rows.length === 0) {
            console.log('ERROR: User not found');
            return;
        }
        const user = userRes.rows[0];
        console.log(`User Found: ${user.name} (Role: ${user.role}, TenantID: ${user.tenant_id})`);

        // 2. Check Lead Stages for this tenant
        const stagesRes = await pool.query('SELECT stage, count(*) FROM leads WHERE tenant_id = $1 GROUP BY stage', [user.tenant_id]);
        console.log('\n--- LEAD STAGE DISTRIBUTION ---');
        console.table(stagesRes.rows);

        // 3. Check for NULL stages
        const nullStages = await pool.query('SELECT count(*) FROM leads WHERE tenant_id = $1 AND stage IS NULL', [user.tenant_id]);
        console.log(`NULL Stages Count: ${nullStages.rows[0].count}`);

        // 4. Check for potential corrupt data in trends (this is usually dynamic, but let's check recent leads)
        const recentLeads = await pool.query('SELECT id, name, stage, created_at FROM leads WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [user.tenant_id]);
        console.log('\n--- RECENT LEADS ---');
        console.table(recentLeads.rows);

        // 5. Check if any 'Negotiation' or 'Site Visit' stages exist (critical for dashboard insights)
        const criticalStages = ['Negotiation', 'Site Visit Done', 'Interested'];
        const foundStages = stagesRes.rows.map(r => r.stage);
        const missing = criticalStages.filter(s => !foundStages.includes(s));
        if (missing.length > 0) {
            console.log(`\nWARNING: Missing critical stages for dashboard insights: ${missing.join(', ')}`);
        }

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await pool.end();
    }
}

audit();
