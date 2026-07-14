const pool = require('./db/pool');
const fs = require('fs');
async function run() {
  const r = await pool.query('SELECT id, name, telephony_agent_id FROM users WHERE telephony_agent_id IS NOT NULL');
  fs.writeFileSync('db_agents.json', JSON.stringify(r.rows, null, 2));
  process.exit(0);
}
run();
