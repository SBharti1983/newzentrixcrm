require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
    let out = '';
    
    const userRes = await pool.query(
        "SELECT id, name, email, role, tenant_id, created_at FROM users WHERE email = 'mmproperties0604@gmail.com'"
    );
    out += '=== USER SEARCH (mmproperties0604@gmail.com) ===\n';
    out += JSON.stringify(userRes.rows, null, 2);

    const tenantRes = await pool.query("SELECT * FROM tenants ORDER BY name");
    out += '\n\n=== ALL TENANTS ===\n';
    out += JSON.stringify(tenantRes.rows, null, 2);

    const allUsersRes = await pool.query(
        "SELECT u.name, u.email, u.role, u.tenant_id, t.name as tenant_name FROM users u JOIN tenants t ON u.tenant_id = t.id ORDER BY t.name, u.name"
    );
    out += '\n\n=== ALL USERS ===\n';
    out += JSON.stringify(allUsersRes.rows, null, 2);

    fs.writeFileSync('check_user_output.txt', out);
    console.log('Done! Output written to check_user_output.txt');
    await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
