/**
 * Migration: Add Activity Status to Leads
 * Decouples 'Stage' (Journey) from 'Status' (Activity)
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Migration: Add lead status column...');
        
        await client.query('BEGIN');

        // Add status column if it doesn't exist
        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New'
        `);

        // Initialize status based on existing stage for compatibility
        // (Optional: If stage is 'New', status is 'New'. If stage is 'Contacted', status is 'Connected' etc.)
        await client.query(`
            UPDATE leads 
            SET status = CASE 
                WHEN stage = 'New' THEN 'New'
                WHEN stage = 'Contacted' THEN 'Connected'
                WHEN stage = 'Negotiation' THEN 'Negotiation'
                ELSE 'New'
            END
            WHERE status = 'New'
        `);

        await client.query('COMMIT');
        console.log('✅ Migration complete: leads.status column added.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
