const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    let client;
    try {
        client = await pool.connect();
        const sqlPath = path.join(__dirname, 'migrations', '20260418_academy.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('🔄 Running Academy Migration...');
        
        // Split by semicolon but be careful with functions (though my SQL is simple)
        const commands = sql.split(';').filter(c => c.trim().length > 0);
        for (const cmd of commands) {
            await client.query(cmd);
        }
        
        console.log('✅ Academy Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

runMigration();
