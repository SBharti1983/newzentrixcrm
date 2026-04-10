const pool = require('./db/pool');
const fs = require('fs');
async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const columns = res.rows.map(r => r.column_name);
    fs.writeFileSync('db_cols.json', JSON.stringify(columns, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
