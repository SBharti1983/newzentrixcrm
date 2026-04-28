const pool = require('./db/pool');

async function enableAll() {
    try {
        const res = await pool.query(
            `UPDATE users SET is_active = TRUE WHERE email LIKE '%@zentrix.com' OR email LIKE '%@zentrix-demo.com' RETURNING id, email`
        );
        console.log('ALL_DEMO_USERS_ENABLED', res.rows.length, 'records');
        process.exit(0);
    } catch (e) {
        console.error('ENABLE_ALL_ERROR', e);
        process.exit(1);
    }
}
enableAll();
