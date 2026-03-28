const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});
async function check() {
    try {
        const { rows } = await pool.query('SELECT name, email, role, is_active FROM users');
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
