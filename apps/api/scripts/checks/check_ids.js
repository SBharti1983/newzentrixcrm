
const pool = require('./db/pool');

async function check() {
    try {
        const leads = await pool.query('SELECT id, name, tenant_id FROM leads LIMIT 1');
        const projects = await pool.query('SELECT id, name FROM projects LIMIT 1');
        console.log('--- LEADS ---');
        console.table(leads.rows);
        console.log('--- PROJECTS ---');
        console.table(projects.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
