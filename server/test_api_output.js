const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    const tid = '6f023c0a-a505-4ae4-962a-038a944d500e'; // from earlier output
    const { rows } = await pool.query(
        `SELECT id, name, email, role, avatar, phone, department, is_active, last_login_at, created_at, reports_to
         FROM users WHERE tenant_id=$1 AND is_active=TRUE ORDER BY role, name`, [tid]
    );
    
    console.log('Total users:', rows.length);
    console.log('\nSample user JSON:');
    console.log(JSON.stringify(rows[0], null, 2));
    console.log('\nAll reports_to values:');
    rows.forEach(u => {
        console.log(u.role.padEnd(15) + u.name.padEnd(25) + 'reports_to=' + JSON.stringify(u.reports_to));
    });
    pool.end();
}
run();
