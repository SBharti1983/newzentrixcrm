const pool = require('./pool');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Schema Migration: Interation-Customer Link');
        await client.query('BEGIN');

        // 1. Add customer_id to interactions if it doesn't exist
        console.log('Checking for customer_id in interactions...');
        const checkCol = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'interactions' AND column_name = 'customer_id'
        `);

        if (checkCol.rows.length === 0) {
            console.log('Adding customer_id column to interactions table...');
            await client.query(`
                ALTER TABLE interactions 
                ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
            `);
        } else {
            console.log('customer_id column already exists.');
        }

        // 2. Retro-populate customer_id from leads
        console.log('Retro-populating customer_id for existing interactions...');
        await client.query(`
            UPDATE interactions i
            SET customer_id = c.id
            FROM customers c
            WHERE i.lead_id = c.lead_id AND i.customer_id IS NULL
        `);

        await client.query('COMMIT');
        console.log('✅ Migration successful!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
