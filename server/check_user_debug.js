const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:KxWNooUInyXoMPltAInuSAnNqfVNDjYt@junction.proxy.rlwy.net:18652/railway' });

async function checkUser() {
    try {
        const res = await pool.query("SELECT * FROM users WHERE email = 'admin@mayainfratech.in'");
        console.log('USER_DATA:', JSON.stringify(res.rows[0], null, 2));
        
        if (res.rows[0] && res.rows[0].tenant_id) {
            const tenantRes = await pool.query("SELECT * FROM tenants WHERE id = $1", [res.rows[0].tenant_id]);
            console.log('TENANT_DATA:', JSON.stringify(tenantRes.rows[0], null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkUser();
