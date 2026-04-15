const pool = require('./pool');

async function run() {
    try {
        console.log('🔄 Adding image_url column to projects table...');
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);
        console.log('✅ Column added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

run();
