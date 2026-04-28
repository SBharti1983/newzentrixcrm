const pool = require('./db/pool');
async function check() {
    try {
        const res = await pool.query("SELECT * FROM bookings LIMIT 1");
        console.log("Columns in bookings:", Object.keys(res.rows[0] || {}));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
