
const pool = require('./server/db/pool');
pool.query("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'customers'::regclass").then(r => {
    console.table(r.rows);
    pool.end();
}).catch(e => { console.error(e); pool.end(); });
