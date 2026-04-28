const pool = require('./db/pool');
pool.query("SELECT email, role FROM users WHERE role = 'agent' LIMIT 1")
    .then(r => {
        console.log(JSON.stringify(r.rows[0]));
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
