require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    // Check which tenant demo users are on
    const users = await pool.query(
        `SELECT u.email, u.role, t.name as tenant, t.slug, t.is_active as tenant_active, t.id as tenant_id
         FROM users u JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email IN ('demoadmin@zentrix.com','demomanager@zentrix.com','demoagent@zentrix.com')`
    );
    console.log('Demo users:', JSON.stringify(users.rows, null, 2));

    // Get the active Maya Infratech tenant (the main one)
    const maya = await pool.query("SELECT id FROM tenants WHERE slug = 'mayainfratech' AND is_active = true");
    if (maya.rows.length > 0) {
        const tid = maya.rows[0].id;
        console.log('\nMoving demo users to Maya Infratech tenant:', tid);
        
        // Move demo users to the active tenant
        for (const email of ['demoadmin@zentrix.com', 'demomanager@zentrix.com', 'demoagent@zentrix.com']) {
            // Delete if already exists on this tenant
            await pool.query('DELETE FROM users WHERE email = $1 AND tenant_id = $2', [email, tid]);
        }
        
        // Delete from old tenant
        await pool.query("DELETE FROM users WHERE email IN ('demoadmin@zentrix.com','demomanager@zentrix.com','demoagent@zentrix.com')");
        
        // Re-create on the correct tenant
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('Test@1234', 10);
        
        const newUsers = [
            { name: 'Demo Admin', email: 'demoadmin@zentrix.com', role: 'admin', avatar: 'DA' },
            { name: 'Demo Manager', email: 'demomanager@zentrix.com', role: 'sales_manager', avatar: 'DM' },
            { name: 'Demo Agent', email: 'demoagent@zentrix.com', role: 'agent', avatar: 'AG' },
        ];
        
        for (const u of newUsers) {
            await pool.query(
                'INSERT INTO users(tenant_id, name, email, password_hash, role, avatar, is_active) VALUES($1, $2, $3, $4, $5, $6, true)',
                [tid, u.name, u.email, hash, u.role, u.avatar]
            );
            console.log('✅', u.email, '|', u.role);
        }
    }

    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
