const pool = require('./server/db/pool');
const bcrypt = require('bcryptjs');

async function promoteUser() {
  const email = 'rohan.mishra@zentrixcrm.com';
  const role = 'superadmin';
  const plainPassword = 'Cyber@2026!';
  
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // First, check if user exists
    const check = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
    
    if (check.rows.length === 0) {
      console.log(`❌ User ${email} NOT found.`);
      process.exit(1);
    }
    
    const user = check.rows[0];
    console.log(`🔍 Current User: ${user.email} (Role: ${user.role})`);
    
    // Update role and password (to ensure they can login with provided credentials)
    const res = await pool.query(
      'UPDATE users SET role = $1, password = $2 WHERE email = $3 RETURNING id, email, role',
      [role, hashedPassword, email]
    );
    
    console.log(`✅ User PROMOTED: ${res.rows[0].email} is now ${res.rows[0].role}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Promotion failed:', err);
    process.exit(1);
  }
}

promoteUser();
