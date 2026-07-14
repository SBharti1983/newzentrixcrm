const pool = require('./db/pool');

async function migrate() {
    try {
        console.log('Migrating lead stages...');
        
        // Lead -> New
        await pool.query("UPDATE leads SET stage = 'New' WHERE stage = 'Lead'");
        // MQL -> Qualified (MQL)
        await pool.query("UPDATE leads SET stage = 'Qualified (MQL)' WHERE stage = 'MQL'");
        // SQL -> Sales Qualified (SQL)
        await pool.query("UPDATE leads SET stage = 'Sales Qualified (SQL)' WHERE stage = 'SQL'");
        // Customer/Closed -> Won
        await pool.query("UPDATE leads SET stage = 'Won' WHERE stage IN ('Customer', 'Closed', 'Opportunity')");
        
        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
