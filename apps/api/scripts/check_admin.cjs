const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const pool = require('../db/pool');

async function check() {
    try {
        const { rows } = await pool.query("SELECT id, email, tenant_id FROM users WHERE LOWER(email) = 'admin@mayainfratech.in'");
        console.log('User:', rows);
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        await pool.end();
    }
}
check();
