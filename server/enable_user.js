const pool = require('./db/pool');

async function enableUser() {
    try {
        const res = await pool.query(
            `UPDATE users SET is_active = TRUE WHERE LOWER(email) = LOWER($1) RETURNING *`,
            ['demoagent@zentrix.com']
        );
        if (res.rows.length > 0) {
            console.log('USER_ENABLED_SUCCESS', JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('USER_NOT_FOUND', 'demoagent@zentrix.com');
        }
        process.exit(0);
    } catch (e) {
        console.error('ENABLE_USER_ERROR', e);
        process.exit(1);
    }
}
enableUser();
