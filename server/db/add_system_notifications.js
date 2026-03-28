require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'zentrixcrm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const MIGRATION = `
CREATE TABLE IF NOT EXISTS system_notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    type        VARCHAR(50) DEFAULT 'info',   -- info | success | warning | error | lead | task
    link        VARCHAR(255),
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sys_notifications_user ON system_notifications(user_id, is_read);
`;

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔄 Running migration: add_system_notifications...');
        await client.query(MIGRATION);
        console.log('✅ table "system_notifications" created successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
