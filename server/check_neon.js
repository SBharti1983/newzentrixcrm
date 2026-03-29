const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const { rows } = await pool.query(`
            SELECT u.email, u.role, u.password_hash, t.name as tenant_name, t.slug as tenant_slug 
            FROM users u 
            JOIN tenants t ON u.tenant_id = t.id
        `);
        console.log('--- USER DATA ---');
        console.log(JSON.stringify(rows, null, 2));
        console.log('--- END ---');
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        await pool.end();
    }
}

check();
