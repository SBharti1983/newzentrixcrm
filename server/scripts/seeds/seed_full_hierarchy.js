const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Cleaning and Seeding Large Demo Hierarchy ---');
        
        const { rows: admins } = await pool.query("SELECT id, tenant_id FROM users WHERE role = 'admin' LIMIT 1");
        if (!admins.length) return console.log('Error: Create an Administrator user first.');
        const tid = admins[0].tenant_id;
        const aid = admins[0].id;

        // Clean up previous demo data
        await pool.query("UPDATE users SET is_active = false WHERE email LIKE 'demo%@zentrix.com' AND role != 'admin'");
        await pool.query("UPDATE users SET is_active = false WHERE email LIKE 'salesagent%@zentrix.com'");

        const createMember = async (name, role, reportsTo) => {
            const email = name.toLowerCase().replace(/ /g, '') + Math.floor(Math.random()*1000) + '@zentrix.com';
            const { rows: [user] } = await pool.query(
                "INSERT INTO users (tenant_id, name, email, password_hash, role, reports_to, avatar, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
                [tid, name, email, 'password123', role, reportsTo, name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(), true]
            );
            return user.id;
        };

        // Manager 1 Branch
        const m1 = await createMember('Demo Manager 1', 'sales_manager', aid);
        const tl1 = await createMember('Demo Team Leader 1', 'team_leader', m1);
        await createMember('Sales Agent 1', 'agent', tl1);
        await createMember('Sales Agent 2', 'agent', tl1);
        await createMember('Sales Agent 3', 'agent', tl1);

        // Manager 2 Branch
        const m2 = await createMember('Demo Manager 2', 'sales_manager', aid);
        const tl2 = await createMember('Demo Team Leader 2', 'team_leader', m2);
        await createMember('Sales Agent 1', 'agent', tl2);
        await createMember('Sales Agent 2', 'agent', tl2);
        await createMember('Sales Agent 3', 'agent', tl2);

        console.log('--- Success: Structure Built ---');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
