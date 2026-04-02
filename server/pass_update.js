const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function go() {
  try {
    const hash = await bcrypt.hash('Cyber@2026!', 10);
    const sql = "UPDATE users SET password = $1 WHERE email = 'rohan.mishra@zentrixcrm.com'";
    await pool.query(sql, [hash]);
    console.log('✅ Password Update SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

go();
