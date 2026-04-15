
const pool = require('./server/db/pool');
pool.query("SELECT email, role, tenant_id FROM users WHERE name LIKE '%Rohan%'").then(r => {
    console.table(r.rows);
    pool.end();
}).catch(e => { console.error(e); pool.end(); });
