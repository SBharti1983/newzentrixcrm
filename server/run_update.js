const pool = require('./db/pool');
const bcrypt = require('bcryptjs');
const util = require('util');

async function main() {
  const email = 'rohan.mishra@zentrixcrm.com';
  const role = 'superadmin';
  const plainPass = 'Cyber@2026!';
  
  try {
    const hash = await bcrypt.hash(plainPass, 10);
    console.log('--- Database Update Attempt ---');
    const sql = `UPDATE users SET "role" = $1, "password" = $2 WHERE "email" = $3 RETURNING id, role`;
    const res = await pool.query(sql, [role, hash, email]);
    
    if (res.rowCount > 0) {
      console.log('✅ Success! Result:', res.rows[0]);
    } else {
      console.log('❌ No rows updated (Is email correct?)');
    }
  } catch (err) {
    console.log('❌ ERROR ENCOUNTERED:');
    console.log(util.inspect(err, { colors: false, depth: null }));
  } finally {
    process.exit(0);
  }
}

main();
