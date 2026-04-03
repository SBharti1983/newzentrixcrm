const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        // 1. Find an existing admin
        const { rows: admins } = await pool.query("SELECT id, tenant_id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1");
        if (!admins.length) return console.log('No Admin found');
        const tid = admins[0].tenant_id;
        const aid = admins[0].id;

        // 2. Create the Manager
        const manRes = await pool.query(
            "INSERT INTO users (tenant_id, name, email, password_hash, role, reports_to, avatar) VALUES ($1, 'Demo Manager', 'manager@zentrix.com', 'password123', 'sales_manager', $2, 'DM') RETURNING id",
            [tid, aid]
        );
        const manId = manRes.rows[0].id;

        // 3. Create the Team Leader
        const tlRes = await pool.query(
            "INSERT INTO users (tenant_id, name, email, password_hash, role, reports_to, avatar) VALUES ($1, 'Demo Team Leader', 'tl@zentrix.com', 'password123', 'team_leader', $2, 'TL') RETURNING id",
            [tid, manId]
        );
        const tlId = tlRes.rows[0].id;

        // 4. Point existing agents to the Team Leader
        await pool.query("UPDATE users SET reports_to = $1 WHERE role = 'agent' AND tenant_id = $2", [tlId, tid]);

        console.log('Hierarchy successfully mapped:');
        console.log('Tier 1: Admin (' + aid + ')');
        console.log('Tier 2: Manager (' + manId + ') reports to Admin');
        console.log('Tier 3: Team Leader (' + tlId + ') reports to Manager');
        console.log('Tier 4: Agents report to Team Leader');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
