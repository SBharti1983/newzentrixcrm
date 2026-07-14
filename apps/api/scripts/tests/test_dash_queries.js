require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
    const tid = '6f023c0a-a505-4ae4-962a-038a944d500e';
    
    try {
        // Test each query individually
        console.log('1. Leads...');
        const leads = await pool.query(`SELECT COUNT(*) FILTER (WHERE stage NOT IN ('Won','Lost')) as active_leads, COUNT(*) FILTER (WHERE stage = 'Won') as won, COUNT(*) FILTER (WHERE stage = 'Lost') as lost, COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as new_this_month, COALESCE(ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1), 0) as win_rate FROM leads WHERE tenant_id = $1`, [tid]);
        console.log('   ✅', leads.rows[0]);

        console.log('2. Bookings...');
        const bookings = await pool.query(`SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as total_value FROM bookings WHERE tenant_id = $1 AND status != 'Cancelled'`, [tid]);
        console.log('   ✅', bookings.rows[0]);

        console.log('3. Installments...');
        const installs = await pool.query(`SELECT COUNT(i.id) as overdue_count, COALESCE(SUM(i.amount),0) as overdue_amount FROM installments i JOIN bookings b ON i.booking_id = b.id WHERE i.tenant_id = $1 AND i.status = 'Overdue'`, [tid]);
        console.log('   ✅', installs.rows[0]);

        console.log('4. Pipeline...');
        const pipeline = await pool.query(`SELECT COALESCE(SUM(CASE WHEN budget ILIKE '%Cr%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 10000000 WHEN budget ILIKE '%L%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 100000 ELSE COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) END), 0) as pipeline_value FROM leads WHERE tenant_id = $1 AND stage NOT IN ('Won','Lost')`, [tid]);
        console.log('   ✅', pipeline.rows[0]);

        console.log('5. Stages...');
        const stages = await pool.query(`SELECT stage, COUNT(*) as count FROM leads WHERE tenant_id = $1 GROUP BY stage`, [tid]);
        console.log('   ✅', stages.rows);

        console.log('6. Followups...');
        const followups = await pool.query(`SELECT f.id, f.type, f.priority, f.scheduled_at, l.name as lead_name, u.name as agent_name FROM followups f LEFT JOIN leads l ON f.lead_id = l.id LEFT JOIN users u ON f.assigned_to = u.id WHERE f.tenant_id = $1 AND f.status = 'Pending' ORDER BY f.scheduled_at LIMIT 10`, [tid]);
        console.log('   ✅', followups.rows.length, 'followups');

        console.log('7. Nurture...');
        const nurture = await pool.query(`SELECT COUNT(*) FILTER (WHERE stage = 'Nurture' OR stage = 'Nurturing') as total_nurture FROM leads WHERE tenant_id = $1`, [tid]);
        console.log('   ✅', nurture.rows[0]);

        console.log('8. Members...');
        const members = await pool.query(`SELECT u.id, u.name, u.avatar, u.role, (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id AND stage NOT IN ('Won','Lost')) as active_leads, (SELECT COUNT(*) FROM bookings WHERE assigned_agent_id = u.id AND status != 'Cancelled') as bookings, (SELECT ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1) FROM leads WHERE assigned_to = u.id) as win_rate FROM users u WHERE u.tenant_id = $1 AND u.is_active = TRUE ORDER BY active_leads DESC`, [tid]);
        console.log('   ✅', members.rows.length, 'members');
        members.rows.forEach(m => console.log('     ', m.name, '|', m.role, '| leads:', m.active_leads, '| win:', m.win_rate));

        console.log('\n✅ ALL QUERIES PASSED');
    } catch (e) {
        console.error('❌ FAILED:', e.message);
    }
    await pool.end();
}

test();
