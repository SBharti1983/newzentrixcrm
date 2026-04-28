const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require&channel_binding=require",
});

async function findSlug() {
    try {
        const res = await pool.query("SELECT slug FROM tenants WHERE id = 'f6adcc05-114b-4053-9ee7-27cb8ace8cfa'");
        console.log('Slug:', res.rows[0]);
    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await pool.end();
    }
}

findSlug();
