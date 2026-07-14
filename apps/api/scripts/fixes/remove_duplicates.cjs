const pool = require('../server/db/pool');

async function removeDuplicates() {
    try {
        const email = 'rohan.mishra@zentrixcrm.com';
        console.log(`Cleaning up duplicates for ${email}`);
        
        const { rows } = await pool.query('SELECT id, role, email FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
        
        if (rows.length <= 1) {
            console.log('No duplicates found.');
            return;
        }

        console.log(`Found ${rows.length} users. Keeping only the first one...`);
        const keepId = rows[0].id;
        
        for (let i = 1; i < rows.length; i++) {
            console.log(`Deleting duplicate user: ${rows[i].id}`);
            await pool.query('DELETE FROM users WHERE id = $1', [rows[i].id]);
        }
        
        console.log('Duplicate cleanup successful.');
    } catch (err) {
        console.error('Error removing duplicates:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

removeDuplicates();
