const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    // Get TL One's ID
    const { rows: [tl] } = await pool.query("SELECT id FROM users WHERE name='Team Leader One' AND is_active=true LIMIT 1");
    if (!tl) return console.log('TL One not found');
    
    // Fix Monika and Surendra  
    const { rowCount } = await pool.query(
        "UPDATE users SET reports_to = $1 WHERE is_active = true AND role = 'agent' AND reports_to IS NOT NULL AND reports_to NOT IN (SELECT id FROM users WHERE is_active = true)",
        [tl.id]
    );
    console.log('Fixed ' + rowCount + ' orphaned agents -> Team Leader One (' + tl.id + ')');
    pool.end();
}
run();
