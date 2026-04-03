const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function test(filterPersonal) {
    const tid = '7e9fed76-474f-49cc-a82c-5b50cea329ce'; // Example tid
    const uid = '7e9fed76-474f-49cc-a82c-5b50cea329ce'; // Example uid
    
    const leadFilter = filterPersonal ? ' AND assigned_to = $2' : '';
    const bookingFilter = filterPersonal ? ' AND assigned_agent_id = $2' : '';
    const followupFilter = filterPersonal ? ' AND assigned_to = $2' : '';
    
    const params = [tid];
    if (filterPersonal) params.push(uid);

    console.log(`\n--- TESTING MODE: ${filterPersonal ? 'PERSONAL' : 'GLOBAL'} ---`);
    console.log('Params:', params);

    const queries = [
        ['Leads summary', `SELECT COUNT(*) FILTER (WHERE stage NOT IN ('Won','Lost')) as active_leads FROM leads WHERE tenant_id = $1${leadFilter}`],
        ['Installments', `SELECT COUNT(i.id) FROM installments i JOIN bookings b ON i.booking_id = b.id WHERE i.tenant_id = $1 AND i.status = 'Overdue'${filterPersonal ? ' AND b.assigned_agent_id = $2' : ''}`],
        ['Pipeline', `SELECT COALESCE(SUM(CASE WHEN budget ILIKE '%Cr%' THEN 1 ELSE 0 END), 0) FROM leads WHERE tenant_id = $1 AND stage NOT IN ('Won','Lost')${leadFilter}`],
        ['Nurture', `SELECT (SELECT COUNT(*) FROM activity_log WHERE tenant_id = $1 AND entity_type = 'lead' AND action = 'updated' AND old_data->>'stage' = 'Nurture' ${filterPersonal ? ' AND user_id = $2' : ''}) FROM leads WHERE tenant_id = $1${leadFilter}`]
    ];

    for (const [name, sql] of queries) {
        try {
            await pool.query(sql, params);
            // console.log(`✅ ${name}: SUCCESS`);
        } catch (err) {
            require('fs').appendFileSync('test_dash_errors.json', JSON.stringify({name, err: err.message}) + '\n');
        }
    }
}

async function run() {
    require('fs').writeFileSync('test_dash_errors.json', '');
    await test(false);
    await test(true);
    await pool.end();
}

run();
