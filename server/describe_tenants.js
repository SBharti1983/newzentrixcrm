const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require&channel_binding=require",
});

async function describeTable() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tenants'
        `);
        console.log('Tenants columns:', res.rows);
    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await pool.end();
    }
}

describeTable();
