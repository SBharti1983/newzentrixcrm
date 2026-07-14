require('dotenv').config();
const pool = require('./db/pool');

async function checkLeadsSchema() {
    try {
        const { rows } = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads'
        `);
        console.log('--- LEADS TABLE SCHEMA ---');
        rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Schema check failed:', err);
        process.exit(1);
    }
}

checkLeadsSchema();
