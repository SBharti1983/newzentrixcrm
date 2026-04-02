const pool = require('../server/db/pool');

async function cleanUsers() {
    try {
        const cleanEmail = 'rohan.mishra@zentrixcrm.com';
        console.log(`Cleaning users for email: ${cleanEmail}`);
        
        // Find any user matching the pattern
        const { rows } = await pool.query('SELECT id, email, role FROM users WHERE email ILIKE \'%rohan.mishra%\'');
        
        if (rows.length === 0) {
            console.log('No users found to clean.');
            return;
        }

        console.log(`Found ${rows.length} users. Consolidating...`);
        
        // Let's just update ALL of them to the clean email
        // and ensure they are ACTIVE and have the correct role.
        for (const user of rows) {
            console.log(`Updating user ID: ${user.id} (current email: ${user.email}, role: ${user.role})`);
            await pool.query(
                'UPDATE users SET email = $1, is_active = true, role = \'admin\' WHERE id = $2',
                [cleanEmail, user.id]
            );
        }
        
        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error cleaning users:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

cleanUsers();
