
const pool = require('./server/db/pool');
pool.query("SELECT id, name, email, role FROM users WHERE id='d322f19c-f10f-4d42-bab3-e38496a8e69c'").then(r => {
    console.table(r.rows);
    pool.end();
}).catch(e => { console.error(e); pool.end(); });
