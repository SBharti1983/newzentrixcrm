const pool = require('./db/pool');

async function test(filterPersonal) {
    const tid = '7e9fed76-474f-49cc-a82c-5b50cea329ce';
    const uid = '7e9fed76-474f-49cc-a82c-5b50cea329ce';
    
    const leadFilter = filterPersonal ? ' AND assigned_to = $2' : '';
    const params = [tid];
    if (filterPersonal) params.push(uid);

    console.log(`\n--- TEST: ${filterPersonal ? 'PERSONAL' : 'GLOBAL'} ---`);

    const sql = `
        SELECT (
            SELECT COUNT(*) FROM activity_log 
            WHERE tenant_id = $1 
            AND entity_type = 'lead' 
            ${filterPersonal ? ' AND user_id = $2' : ''}
        ) as reactivated
        FROM leads WHERE tenant_id = $1${leadFilter}
    `;

    try {
        const result = await pool.query(sql, params);
        console.log('✅ SUCCESS:', result.rows[0]);
    } catch (err) {
        console.log('❌ ERROR:', err.message);
        console.log('BIND COUNT:', params.length);
        console.log('SQL:', sql);
    }
}

async function run() {
    await test(false);
    await test(true);
    await pool.end();
}

run();
