const pool = require('./db/pool');
const fs = require('fs');
async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads'");
        fs.writeFileSync('../leads_schema.json', JSON.stringify(res.rows, null, 2));
        console.log("Written to leads_schema.json");
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}
check();
