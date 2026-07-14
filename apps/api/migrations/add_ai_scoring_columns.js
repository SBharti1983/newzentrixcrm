require('dotenv').config({path: 'server/.env'});
const pool = require('./pool');

async function migrate() {
    try {
        console.log('🚀 Starting AI Lead Scoring Schema Migration...');
        
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS sentiment_pulse TEXT DEFAULT 'Neutral';
        `);
        
        console.log('✅ Columns added: ai_analysis (jsonb), sentiment_pulse (text)');
        console.log('✅ Migration successful');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
