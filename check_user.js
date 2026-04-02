const pool = require('./server/db/pool');
async function go() {
  const email = 'rohan.mishra@zentrixcrm.com';
  const res = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
  console.log('Result:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
go();
