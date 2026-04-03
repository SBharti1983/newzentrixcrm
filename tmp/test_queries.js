import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require&channel_binding=require'
});

async function test() {
  const tid = '7e9fed76-474f-49cc-a82c-5b50cea329ce'; // Example tenant
  const uid = '7e9fed76-474f-49cc-a82c-5b50cea329ce'; // Example user
  const filterPersonal = true;
  
  const leadFilter = filterPersonal ? ' AND assigned_to = $2' : '';
  const bookingFilter = filterPersonal ? ' AND assigned_agent_id = $2' : '';
  const followupFilter = filterPersonal ? ' AND assigned_to = $2' : '';
  
  const params = [tid, uid];

  try {
    console.log('Testing dashboard queries...');
    const result = await pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE stage = 'Nurture') as total_nurture,
                    (
                        SELECT COUNT(*)
                        FROM activity_log
                        WHERE tenant_id = $1
                          AND entity_type = 'lead'
                          AND action = 'updated'
                          AND old_data->>'status' = 'Nurture'
                          AND (new_data->>'status' = 'Active' OR new_data->>'status' IS NULL)
                          AND created_at >= date_trunc('month', NOW())
                          ${filterPersonal ? ' AND user_id = $2' : ''}
                    ) as reactivated_this_month
                FROM leads WHERE tenant_id = $1${leadFilter}`, params);
    console.log('Nurture query success:', result.rows[0]);
  } catch (err) {
    console.error('Nurture query error:', err.message);
  }

  try {
    const result = await pool.query(`
                SELECT COUNT(i.*) as overdue_count, COALESCE(SUM(i.amount),0) as overdue_amount
                FROM installments i
                JOIN bookings b ON i.booking_id = b.id
                WHERE i.tenant_id = $1 AND i.status = 'Overdue'${filterPersonal ? ' AND b.assigned_agent_id = $2' : ''}`, params);
    console.log('Overdue query success:', result.rows[0]);
  } catch (err) {
    console.error('Overdue query error:', err.message);
  }

  await pool.end();
}

test();
