const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('=== HIERARCHY FIX: Diagnosing current state ===');

        // 1. Get the demo admin's tenant
        const { rows: [admin] } = await pool.query(
            "SELECT id, tenant_id, name FROM users WHERE email = 'demoadmin@zentrix.com'"
        );
        if (!admin) return console.log('ERROR: demoadmin@zentrix.com not found');
        
        const tid = admin.tenant_id;
        const adminId = admin.id;
        console.log('Admin:', admin.name, 'ID:', adminId, 'Tenant:', tid);

        // 2. Show all active users in this tenant with their reports_to
        const { rows: allUsers } = await pool.query(
            "SELECT id, name, role, reports_to FROM users WHERE tenant_id = $1 AND is_active = true ORDER BY role, name",
            [tid]
        );
        
        console.log('\n--- BEFORE FIX ---');
        allUsers.forEach(u => {
            console.log(`  ${u.role.padEnd(15)} ${u.name.padEnd(25)} reports_to: ${u.reports_to || 'NULL'}`);
        });

        // 3. Delete old seed data and re-seed cleanly
        console.log('\n--- Cleaning old demo seed data ---');
        await pool.query("DELETE FROM users WHERE tenant_id = $1 AND email LIKE '%@zentrix-demo.com'", [tid]);

        // 4. Create fresh hierarchy with PROPER reports_to links
        const insert = async (name, email, role, reportsTo) => {
            const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
            const { rows: [user] } = await pool.query(
                `INSERT INTO users (tenant_id, name, email, password_hash, role, reports_to, is_active, avatar)
                 VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING id, name, role, reports_to`,
                [tid, name, email, 'demo123', role, reportsTo, avatar]
            );
            console.log(`  Created: ${user.role.padEnd(15)} ${user.name.padEnd(25)} reports_to: ${user.reports_to || 'NULL'}`);
            return user.id;
        };

        console.log('\n--- Creating fresh hierarchy ---');
        
        // Branch 1: Admin -> Manager Alpha -> TL One -> Agents
        const m1 = await insert('Sales Manager Alpha', 'sm.alpha@zentrix-demo.com', 'sales_manager', adminId);
        const tl1 = await insert('Team Leader One', 'tl.one@zentrix-demo.com', 'team_leader', m1);
        await insert('Agent Smith', 'agent.smith@zentrix-demo.com', 'agent', tl1);
        await insert('Agent Johnson', 'agent.johnson@zentrix-demo.com', 'agent', tl1);
        await insert('Agent Priya', 'agent.priya@zentrix-demo.com', 'agent', tl1);

        // Branch 2: Admin -> Manager Beta -> TL Two -> Agents
        const m2 = await insert('Sales Manager Beta', 'sm.beta@zentrix-demo.com', 'sales_manager', adminId);
        const tl2 = await insert('Team Leader Two', 'tl.two@zentrix-demo.com', 'team_leader', m2);
        await insert('Agent Williams', 'agent.williams@zentrix-demo.com', 'agent', tl2);
        await insert('Agent Brown', 'agent.brown@zentrix-demo.com', 'agent', tl2);
        await insert('Agent Kumar', 'agent.kumar@zentrix-demo.com', 'agent', tl2);

        // 5. Also fix existing real users (Monika, Surendra) - assign them to TL1
        const { rows: realAgents } = await pool.query(
            "SELECT id, name FROM users WHERE tenant_id = $1 AND role = 'agent' AND is_active = true AND email NOT LIKE '%@zentrix-demo.com' AND (reports_to IS NULL)",
            [tid]
        );
        for (const agent of realAgents) {
            await pool.query("UPDATE users SET reports_to = $1 WHERE id = $2", [tl1, agent.id]);
            console.log(`  Fixed existing agent: ${agent.name} -> reports_to Team Leader One`);
        }

        // 6. Verify final state
        const { rows: final } = await pool.query(
            "SELECT id, name, role, reports_to FROM users WHERE tenant_id = $1 AND is_active = true ORDER BY role, name",
            [tid]
        );
        
        console.log('\n--- AFTER FIX ---');
        final.forEach(u => {
            const parentName = u.reports_to ? final.find(p => p.id === u.reports_to)?.name || 'UNKNOWN' : 'ROOT';
            console.log(`  ${u.role.padEnd(15)} ${u.name.padEnd(25)} -> ${parentName}`);
        });

        // 7. Count the tree
        const roots = final.filter(u => !u.reports_to);
        const withParent = final.filter(u => u.reports_to);
        console.log(`\n  Roots: ${roots.length}, With parent: ${withParent.length}, Total: ${final.length}`);
        console.log('\n=== HIERARCHY FIX COMPLETE ===');
        
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        pool.end();
    }
}

run();
