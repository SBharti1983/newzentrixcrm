import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../../../apps/api/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SIKANDAR_TENANT_ID = 'fca8a71c-4190-4be3-a467-5745bd31291c';
const MAYA_TENANT_ID = '1bbc00c0-766f-498d-9814-b9fdeb56b24d';

async function main() {
  // Check if tenant exists
  const { rows: tenants } = await pool.query(
    "SELECT id FROM tenants WHERE id = $1;",
    [SIKANDAR_TENANT_ID]
  );
  if (tenants.length === 0) {
    console.error(`❌ Tenant ${SIKANDAR_TENANT_ID} not found.`);
    await pool.end();
    return;
  }

  console.log(`Copying personas from tenant ${MAYA_TENANT_ID} to ${SIKANDAR_TENANT_ID}...`);

  // Get Maya personas
  const { rows: personas } = await pool.query(
    "SELECT * FROM ai_employee_personas WHERE tenant_id = $1;",
    [MAYA_TENANT_ID]
  );

  for (const p of personas) {
    // Generate new UUID to avoid key conflict
    const { rows: insertRes } = await pool.query(`
        INSERT INTO ai_employee_personas (
            tenant_id, employee_name, employee_code, role, avatar_url,
            persona_config, voice_config, knowledge_scope, escalation_rules, is_active,
            telephony_number, telephony_provider, telephony_config,
            whatsapp_number, whatsapp_provider, whatsapp_config,
            max_concurrent_calls, max_daily_outbound, working_hours,
            shift_start_time, shift_end_time, cooldown_seconds, current_status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) ON CONFLICT DO NOTHING RETURNING id;
      `, [
        SIKANDAR_TENANT_ID, p.employee_name, p.employee_code + '-SIK', p.role, p.avatar_url,
        p.persona_config, p.voice_config, p.knowledge_scope, p.escalation_rules, p.is_active,
        p.telephony_number, p.telephony_provider, p.telephony_config,
        p.whatsapp_number, p.whatsapp_provider, p.whatsapp_config,
        p.max_concurrent_calls, p.max_daily_outbound, p.working_hours,
        p.shift_start_time, p.shift_end_time, p.cooldown_seconds, p.current_status
      ]);
      
      console.log(`✅ Seeded persona: ${p.employee_name} (${p.role}) - New ID: ${insertRes[0]?.id || 'Skipped (Duplicate)'}`);
  }

  await pool.end();
}

main().catch(console.error);
