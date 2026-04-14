const pool = require('./db/pool');
async function check() {
    try {
        const res = await pool.query("SELECT * FROM inventory LIMIT 0");
        console.log("Columns in inventory:", res.fields.map(f => f.name));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
