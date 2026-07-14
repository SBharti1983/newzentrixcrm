const pool = require('./db/pool');
async function testUpdate() {
   try {
       // get one user
       const res1 = await pool.query(`SELECT id, tenant_id FROM users LIMIT 1`);
       if (res1.rows.length === 0) { console.log('no user'); return process.exit(0); }
       const u = res1.rows[0];
       
       console.log('Update user', u.id);
       const res2 = await pool.query(
         `UPDATE users SET telephony_agent_id = $1 WHERE id=$2 RETURNING *`,
         ['TEST_AGENT_001', u.id]
       );
       console.log(res2.rows[0].telephony_agent_id);
       process.exit(0);
   } catch(e) {
       console.error(e);
       process.exit(1); 
   }
}
testUpdate();
