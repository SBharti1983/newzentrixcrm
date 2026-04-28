const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db/pool');

async function fixStuckCalls() {
    const result = await pool.query(
        `UPDATE interactions SET outcome = 'Connected' 
         WHERE outcome = 'Calling...' AND type = 'Call' AND created_at > NOW() - INTERVAL '1 day' 
         RETURNING id, outcome`
    );
    console.log(`Fixed ${result.rows.length} stuck "Calling..." interactions:`, result.rows.map(r => r.id));
    await pool.end();
}

fixStuckCalls().catch(e => { console.error(e); process.exit(1); });
