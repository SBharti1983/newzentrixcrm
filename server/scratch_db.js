const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const sqlPath = path.resolve(__dirname, 'src/migrations/stored_procedures_v3_leads.sql');
        console.log(`Reading SQL file from: ${sqlPath}`);
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log(`\n🚀 Deploying Stored Procedure get_lead_details...\n`);

        await pool.query(sqlContent);
        console.log(`  ✅ get_lead_details() deployed successfully`);

        console.log(`\n══════════════════════════════════════`);
        console.log(`✅ Deployment Complete`);
        console.log(`══════════════════════════════════════\n`);
    } catch (e) {
        console.error(`  ❌ Deployment Failed:`, e.message);
    } finally {
        await pool.end();
    }
}
run();
