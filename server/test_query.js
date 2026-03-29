const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const { rows } = await pool.query('SELECT email, is_active FROM users');
    console.log("Users:", rows);
    const { rows: tRows } = await pool.query('SELECT slug, is_active FROM tenants');
    console.log("Tenants:", tRows);
    process.exit(0);
}
run();
