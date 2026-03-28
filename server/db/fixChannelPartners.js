const pool = require('./pool');

async function upgrade() {
    console.log('🔄 Adding missing columns to channel_partners...');
    try {
        await pool.query(`
            ALTER TABLE channel_partners
            ADD COLUMN IF NOT EXISTS avatar VARCHAR(10),
            ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
        `);
        console.log('✅ Added avatar and rating columns.');
    } catch (err) {
        console.error('❌ Upgrade failed:', err);
    } finally {
        process.exit();
    }
}

upgrade();
