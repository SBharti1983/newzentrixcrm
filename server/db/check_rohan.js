const pool = require('./pool');

async function checkRohan() {
    try {
        const { rows } = await pool.query("SELECT id, name, email, xp, level, rank_title FROM users WHERE email = 'rohan@zentrix.com'");
        console.log('Rohan Profile:', JSON.stringify(rows[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRohan();
