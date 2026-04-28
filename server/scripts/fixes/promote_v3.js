const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function promote() {
  const email = 'rohan.mishra@zentrixcrm.com';
  const role = 'superadmin';
  const plainPassword = 'Cyber@2026!';
  
  try {
    const hash = await bcrypt.hash(plainPassword, 10);
    // Be absolutely sure about column names
    const sql = `UPDATE users SET "role" = $1, "password" = $2 WHERE "email" = $3 RETURNING id, role`;
    const res = await pool.query(sql, [role, hash, email]);
    
    if (res.rowCount > 0) {
      console.log(`✅ Success: User ${email} is now ${res.rows[0].role}`);
    } else {
      console.log(`❌ User ${email} NOT found.`);
    }
    process.exit(0);
  } catch (err) {
    require('fs').writeFileSync('error.json', JSON.stringify(err, null, 2));
    console.error('❌ Update failed. Check error.json');
    process.exit(1);
  }
}

promote();
