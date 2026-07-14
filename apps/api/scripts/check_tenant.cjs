const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const pool = require('../db/pool');

async function check() {
    try {
        const { rows } = await pool.query("SELECT id, name, slug, is_active FROM tenants WHERE id = '1bbc00c0-766f-498d-9814-b9fdeb56b24d'");
        console.log('Tenant:', rows);
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        await pool.end();
    }
}
check();
