require('dotenv').config({path: 'server/.env'});
const pool = require('./pool');

async function migrate() {
    try {
        console.log('🚀 Starting Gamification Schema Migration...');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS rank_title TEXT DEFAULT 'Novice Closer';
        `);
        
        console.log('✅ Columns added: xp (int), level (int), rank_title (text)');
        console.log('✅ Migration successful');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
