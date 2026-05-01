const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        try {
            await pool.query('ALTER TABLE channel_partners RENAME COLUMN rera_number TO rera_no;');
        } catch(e) {}
        await pool.query('ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS contact_person TEXT; ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS notes TEXT; ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS assigned_projects JSONB; ALTER TABLE channel_partners ADD COLUMN IF NOT EXISTS type TEXT;');
        console.log('DB altered successfully!');
    } catch(e){
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
