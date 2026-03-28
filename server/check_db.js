const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        const { rows } = await pool.query('SELECT count(*) FROM bookings');
        console.log('Bookings count:', rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
