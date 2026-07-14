const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../../.env')});
const pool = require('../../db/pool');

async function setup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS message_templates (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
                name text NOT NULL,
                body text NOT NULL,
                category text DEFAULT 'General',
                created_at timestamptz DEFAULT NOW()
            )
        `);
        console.log('✅ Table message_templates ready');

        const tid = '1bbc00c0-766f-498d-9814-b9fdeb56b24d'; // Correct Maya Infratech ID
        await pool.query(`
            INSERT INTO message_templates (tenant_id, name, body, category)
            VALUES 
                ($1, 'Welcome Message', 'Namaste {{name}}! Thank you for showing interest in {{project}}. Our team will contact you shortly.', 'Introduction'),
                ($1, 'Site Visit Confirmation', 'Hi {{name}}, your site visit for {{project}} is confirmed for tomorrow. See you there!', 'Site Visit'),
                ($1, 'Price List Request', 'Hello {{name}}, as requested, please find the updated price list for {{project}} attached below.', 'Sales')
            ON CONFLICT DO NOTHING
        `, [tid]);
        console.log('✅ Sample WhatsApp templates seeded');

    } catch (e) {
        console.error('❌ Setup failed:', e.message);
    } finally {
        await pool.end();
    }
}

setup();
