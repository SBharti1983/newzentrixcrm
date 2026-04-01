const pool = require('./db/pool');
async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS nurture_reason TEXT,
            ADD COLUMN IF NOT EXISTS reconnect_date DATE;
        `);
        console.log("Migration successful: added nurture_reason and reconnect_date to leads table.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
        process.exit();
    }
}
migrate();
