const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const pool = require('../db/pool');

async function check() {
    try {
        const { rows } = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('Tables:', rows.map(r => r.tablename));
        
        const { rows: columns } = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'refresh_tokens'");
        console.log('Refresh Tokens Columns:', columns);
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        await pool.end();
    }
}
check();
