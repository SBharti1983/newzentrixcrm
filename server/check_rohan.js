const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require&channel_binding=require",
});

async function checkUser() {
    try {
        const res = await pool.query("SELECT id, email, role, tenant_id FROM users WHERE email ILIKE 'rohan.mishra@zentrixcrm.com'");
        console.log('User found:', res.rows[0]);
        if (res.rows[0]) {
            const tenant = await pool.query("SELECT id, name, domain FROM tenants WHERE id = $1", [res.rows[0].tenant_id]);
            console.log('Tenant found:', tenant.rows[0]);
        }
    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await pool.end();
    }
}

checkUser();
