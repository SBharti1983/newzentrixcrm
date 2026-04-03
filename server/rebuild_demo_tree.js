const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- REBUILDING HIERARCHY ---');
        const { rows: admins } = await pool.query("SELECT id, tenant_id FROM users WHERE email = 'demoadmin@zentrix.com' LIMIT 1");
        if (!admins.length) return console.log('Error: demoadmin@zentrix.com not found');
        
        const tid = admins[0].tenant_id;
        const aid = admins[0].id;

        // 1. Clean existing demo data for this tenant
        await pool.query("DELETE FROM users WHERE tenant_id = $1 AND email LIKE '%@zentrix-demo.com'", [tid]);
        
        // 2. Helper to create users
        const create = async (name, role, reportsTo) => {
            const email = name.toLowerCase().replace(/ /g, '.') + '@zentrix-demo.com';
            const { rows } = await pool.query(
                "INSERT INTO users (tenant_id, name, email, password_hash, role, reports_to, is_active, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
                [tid, name, email, 'demo123', role, reportsTo, true, name.split(' ').map(n=>n[0]).join('').toUpperCase()]
            );
            return rows[0].id;
        };

        // 3. Build Branch 1
        console.log('Building Manager 1 Branch...');
        const m1 = await create('Sales Manager Alpha', 'sales_manager', aid);
        const tl1 = await create('Team Leader One', 'team_leader', m1);
        await create('Agent Smith', 'agent', tl1);
        await create('Agent Johnson', 'agent', tl1);

        // 4. Build Branch 2
        console.log('Building Manager 2 Branch...');
        const m2 = await create('Sales Manager Beta', 'sales_manager', aid);
        const tl2 = await create('Team Leader Two', 'team_leader', m2);
        await create('Agent Williams', 'agent', tl2);
        await create('Agent Brown', 'agent', tl2);

        console.log('--- HIERARCHY REBUILT SUCCESSFULLY ---');
    } catch (err) {
        console.error('SEED ERROR:', err);
    } finally {
        pool.end();
    }
}
run();
