const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function fixUser() {
    try {
        const passwordHash = await bcrypt.hash('Test@1234', 12);
        const res = await pool.query(
            `UPDATE users SET is_active = TRUE, password_hash = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, email, is_active`,
            [passwordHash, 'demoagent@zentrix.com']
        );
        if (res.rows.length > 0) {
            console.log('USER_FIXED_SUCCESS', JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('USER_NOT_FOUND', 'demoagent@zentrix.com');
        }
        process.exit(0);
    } catch (e) {
        console.error('FIX_USER_ERROR', e);
        process.exit(1);
    }
}
fixUser();
