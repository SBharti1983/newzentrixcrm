const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function removeMaya() {
    try {
        const { rowCount } = await pool.query("UPDATE users SET is_active = false WHERE name = 'Maya Admin'");
        console.log(`Successfully deactivated Maya Admin. Count: ${rowCount}`);
    } catch (err) {
        console.error('Error deactivating Maya Admin:', err);
    } finally {
        pool.end();
    }
}

removeMaya();
