const bcrypt = require('bcryptjs');

const hash = '$2b$10$ajC/A0O57I02MB34DdyNre3tP5yI8p/q6P1tK1wV/Q0fT6rN2z0eK'; // I only saw part of it in command_status output, let me grab the exact hash from DB again. 

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE email='arjun@zentrix.com'`);
    if(rows.length > 0) {
        const hash = rows[0].password_hash;
        console.log("HASH:", hash);
        const match = await bcrypt.compare('Admin@123', hash);
        console.log("MATCH:", match);
    }
    process.exit(0);
}
run();
