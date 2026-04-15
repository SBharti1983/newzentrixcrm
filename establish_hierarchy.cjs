
const pool = require('./server/db/pool');

async function fix() {
    try {
        console.log("Finding Team Leader Vikram...");
        const tl = await pool.query("SELECT id FROM users WHERE email='vikram.leader@zentrixcrm.com'");
        if (!tl.rows[0]) {
            console.error("Vikram not found");
            return;
        }
        
        console.log("Setting Vikram as Rohan's boss...");
        await pool.query("UPDATE users SET reports_to = $1 WHERE email = 'rohan@zentrix.com'", [tl.rows[0].id]);
        
        console.log("Finding Manager Priya...");
        const manager = await pool.query("SELECT id FROM users WHERE email='priya@zentrix.com'");
        if (manager.rows[0]) {
             console.log("Setting Priya as Vikram's boss...");
             await pool.query("UPDATE users SET reports_to = $1 WHERE email = 'vikram.leader@zentrixcrm.com'", [manager.rows[0].id]);
        }
        
        console.log("SUCCESS! Hierarchy linked: Rohan -> Vikram -> Priya");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

fix();
