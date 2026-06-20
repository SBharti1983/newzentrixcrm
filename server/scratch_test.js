const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const leadRes = await pool.query("SELECT id, tenant_id FROM leads WHERE name = 'Vivek Chawla' LIMIT 1");
        if (leadRes.rows.length === 0) {
            console.log("No lead named Vivek Chawla found.");
            return;
        }
        const { id } = leadRes.rows[0];

        const rawRes = await pool.query("SELECT COUNT(*) FROM activity_log WHERE (entity_type = 'lead' AND entity_id::uuid = $1) OR (entity_type = 'contact' AND entity_id::uuid = $1)", [id]);
        console.log(`\nTotal raw activity_log records in DB for this lead: ${rawRes.rows[0].count}`);

        const updatedRes = await pool.query("SELECT action, COUNT(*) FROM activity_log WHERE ((entity_type = 'lead' AND entity_id::uuid = $1) OR (entity_type = 'contact' AND entity_id::uuid = $1)) GROUP BY action", [id]);
        console.log("\nCounts grouped by action:");
        console.log(updatedRes.rows);

    } catch(e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
run();
