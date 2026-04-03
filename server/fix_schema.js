const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Applying Critical Schema Fix ---');
        
        // 1. Add settings column to tenants
        await pool.query(`
            ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
        `);
        console.log('✓ Added settings column to tenants');

        // 2. Clear out any accidental superadmin roles if needed? 
        // No, let's just fix the middleware first.

        console.log('\n--- Schema Fix Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration Error:', err);
        process.exit(1);
    }
}

run();
