require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function addStripeColumns() {
    const client = await pool.connect();
    try {
        console.log('🔄 Adding Stripe columns to tenants table...');
        await client.query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
        `);
        console.log('✅ Columns added successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addStripeColumns();
