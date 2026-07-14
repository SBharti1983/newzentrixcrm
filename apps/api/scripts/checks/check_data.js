const pool = require('./db/pool');

async function check() {
    try {
        const users = await pool.query("SELECT id, name FROM users WHERE name ILIKE '%Sikandar%'");
        console.log('Users found:', users.rows);
        if (users.rows.length === 0) {
            console.log('No user found');
            return;
        }

        const userId = users.rows[0].id;
        const leads = await pool.query("SELECT COUNT(*) as count, AVG(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '')::NUMERIC) as avg_budget FROM leads WHERE assigned_to = $1", [userId]);
        console.log('Leads for user:', leads.rows);

        const interactions = await pool.query("SELECT COUNT(*) FROM interactions WHERE user_id = $1", [userId]);
        console.log('Interactions for user:', interactions.rows);

        const projects = await pool.query(`
            SELECT p.name, COUNT(l.id) 
            FROM leads l JOIN projects p ON l.project_id = p.id 
            WHERE l.assigned_to = $1 
            GROUP BY p.name
        `, [userId]);
        console.log('Projects for user leads:', projects.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
