const path = require('path');
// Manually resolve the path to bcryptjs in the server directory
const bcrypt = require('../server/node_modules/bcryptjs');
const pool = require('../server/db/pool');

async function fixCredentials() {
    try {
        const email = 'rohan.mishra@zentrixcrm.com';
        const rawPassword = 'Cyber@2026!';
        
        console.log(`Checking user: ${email}`);
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (rows.length === 0) {
            console.log(`User ${email} not found.`);
            return;
        }

        const user = rows[0];
        console.log(`User found. Role: ${user.role}, Is Active: ${user.is_active}`);

        const isValid = await bcrypt.compare(rawPassword, user.password_hash);
        console.log(`Current password matches snapshot: ${isValid}`);

        if (!isValid) {
            console.log(`Resetting password for ${email} to ${rawPassword}...`);
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(rawPassword, salt);
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
            console.log('Password reset successfully.');
        }

        // Just in case, ensure user is active too
        if (!user.is_active) {
            await pool.query('UPDATE users SET is_active = true WHERE id = $1', [user.id]);
            console.log('User account activated.');
        }

    } catch (err) {
        console.error('An error occurred:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

fixCredentials();
