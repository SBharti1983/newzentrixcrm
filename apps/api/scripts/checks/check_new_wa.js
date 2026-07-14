const pool = require('./db/pool');

async function check() {
    try {
        const { rows } = await pool.query(`
            SELECT id, recipient, status, body, sent_at 
            FROM notifications 
            WHERE channel = 'WhatsApp' 
            ORDER BY sent_at DESC 
            LIMIT 3
        `);
        console.log('--- LATEST WHATSAPP MESSAGES ---');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
