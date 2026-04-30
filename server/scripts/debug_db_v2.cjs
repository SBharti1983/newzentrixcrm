const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const pool = require('../db/pool');

async function check() {
    try {
        const { rows: columns } = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'refresh_tokens' 
            AND table_schema = 'public'
        `);
        console.log('Refresh Tokens Columns (public):', columns);
        
        // Also check if any unique constraint is violated on INSERT
        // By trying to dry-run or just checking constraints
        const { rows: constraints } = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE n.nspname = 'public' 
            AND contype = 'u' 
            AND conrelid = 'refresh_tokens'::regclass
        `);
        console.log('Constraints:', constraints);

    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        await pool.end();
    }
}
check();
