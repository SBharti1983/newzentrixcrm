
const pool = require('./server/db/pool');
pool.query("SELECT id, name, email, role, reports_to FROM users WHERE email LIKE '%vikram%'").then(r => {
    console.table(r.rows);
    pool.end();
}).catch(e => { console.error(e); pool.end(); });
