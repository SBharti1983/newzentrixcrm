const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function go() {
  try {
    const hash = await bcrypt.hash('Cyber@2026!', 10);
    const sql = "UPDATE users SET role = 'superadmin', password = $1 WHERE email = 'rohan.mishra@zentrixcrm.com' RETURNING id, role";
    const res = await pool.query(sql, [hash]);
    
    if (res.rowCount > 0) {
      console.log('SUCCESS: User is now ' + res.rows[0].role);
    } else {
      console.log('FAIL: User not found or not updated');
    }
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

go();
