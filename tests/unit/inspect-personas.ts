import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../../apps/api/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const { rows } = await pool.query(
    "SELECT id, tenant_id, employee_name, role, is_active FROM ai_employee_personas;"
  );
  console.log('ai_employee_personas rows:', rows);
  await pool.end();
}

main().catch(console.error);
