import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../../apps/api/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const { rows } = await pool.query(
    "SELECT id, tenant_id, name, email, role, is_active FROM users;"
  );
  console.log('users rows:', rows);
  await pool.end();
}

main().catch(console.error);
