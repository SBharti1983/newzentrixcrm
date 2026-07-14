const pool = require('./pool');

async function migrate() {
    try {
        console.log('--- MIGRATION: Adding AI telemetry to leads table ---');
        
        // 1. Add ai_analysis (JSONB)
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'
        `);
        console.log('✓ Added ai_analysis column');

        // 2. Add sentiment_pulse (TEXT)
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS sentiment_pulse TEXT DEFAULT 'Neutral'
        `);
        console.log('✓ Added sentiment_pulse column');

        console.log('--- Migration completed successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
