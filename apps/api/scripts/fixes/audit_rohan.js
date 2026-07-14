import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  try {
    const res = await pool.query(`
      SELECT u.email, u.role, t.slug as tenant_slug, ut.role as tenant_role
      FROM users u
      LEFT JOIN user_tenants ut ON u.id = ut.user_id
      LEFT JOIN tenants t ON ut.tenant_id = t.id
      WHERE u.email = 'rohan.mishra@zentrixcrm.com'
    `);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

audit();
