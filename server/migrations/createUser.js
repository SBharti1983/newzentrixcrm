require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    try {
        const { rows: [tenant] } = await pool.query("SELECT id FROM tenants WHERE slug = 'zentrix' LIMIT 1");
        if (!tenant) return console.log('Tenant not found');

        const pass = '123456';
        const hash = await bcrypt.hash(pass, 10);

        await pool.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role, avatar)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        `, [tenant.id, 'Sikan', 'sikan@zentrix.com', hash, 'admin', 'SK']);

        console.log('✅ User sikan@zentrix.com created/updated with password: ' + pass);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
