const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const res = await pool.query(`SELECT get_dashboard_kpis('1bbc00c0-766f-498d-9814-b9fdeb56b24d'::uuid, '174cfaa9-baa7-4313-bd8b-1fe05f1794db'::uuid, false, '{}'::text::uuid[])`);
        console.log("Result:", res.rows);
    } catch(e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
run();
