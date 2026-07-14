require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

async function check() {
    try {
        const res = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE email = $1', ['demoagent@zentrix.com']);
        console.log('USER_CHECK_RESULT', JSON.stringify(res.rows, null, 2));
        await pool.end();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
