const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const hash = await bcrypt.hash('Admin@123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'arjun@zentrix.com']);
        console.log("Successfully reset arjun@zentrix.com to Admin@123");
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
