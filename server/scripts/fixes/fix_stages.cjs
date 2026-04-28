require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const STAGE_MAP = {
    'Qualified (MQL)': 'Qualified',
    'Sales Qualified (SQL)': 'Qualified',
    'Qualified (SQL)': 'Qualified',
    'Site Visit Scheduled': 'Site Visit',
    'Connected': 'Contacted',
    'Attempted to Contact': 'Contacted',
};

(async () => {
    try {
        // 1. Audit current stages
        const audit = await pool.query('SELECT stage, COUNT(*)::int as cnt FROM leads GROUP BY stage ORDER BY stage');
        console.log('=== CURRENT STAGES IN DB ===');
        audit.rows.forEach(r => console.log(`  ${r.stage}: ${r.cnt} leads`));

        // 2. Migrate old stages
        let totalUpdated = 0;
        for (const [oldStage, newStage] of Object.entries(STAGE_MAP)) {
            const res = await pool.query(
                'UPDATE leads SET stage = $1 WHERE stage = $2',
                [newStage, oldStage]
            );
            if (res.rowCount > 0) {
                console.log(`  Migrated "${oldStage}" → "${newStage}": ${res.rowCount} leads`);
                totalUpdated += res.rowCount;
            }
        }
        console.log(`\n=== TOTAL MIGRATED: ${totalUpdated} leads ===\n`);

        // 3. Verify
        const verify = await pool.query('SELECT stage, COUNT(*)::int as cnt FROM leads GROUP BY stage ORDER BY stage');
        console.log('=== UPDATED STAGES ===');
        verify.rows.forEach(r => console.log(`  ${r.stage}: ${r.cnt} leads`));

        await pool.end();
        console.log('\nDone!');
    } catch (e) {
        console.error('Error:', e.message);
        await pool.end();
        process.exit(1);
    }
})();
