const pool = require('../server/db/pool');

async function seedDemoData() {
    try {
        console.log('--- Starting Demo Data Seed (V3) ---');
        
        // 1. Find the target user and tenant
        const userRes = await pool.query('SELECT id, tenant_id FROM users WHERE email = $1', ['arjun@zentrix.com']);
        if (userRes.rows.length === 0) {
            console.error('User Not Found!');
            return;
        }
        const { id: userId, tenant_id: tenantId } = userRes.rows[0];
        console.log(`Found User: arjun@zentrix.com (ID: ${userId}) in Tenant: ${tenantId}`);

        // Clean
        await pool.query('DELETE FROM leads WHERE tenant_id = $1 AND email LIKE \'%@demo.com\'', [tenantId]);
        await pool.query('DELETE FROM interactions WHERE tenant_id = $1 AND type = \'Call\'', [tenantId]);

        // Leads
        const demoLeads = [
            { name: 'Kushal Agarwal', phone: '+91 98765 12345', stage: 'Qualified (MQL)', score: 88, source: 'Facebook Ads', city: 'Kharadi, Pune' },
            { name: 'Simran Verma', phone: '+91 98765 22334', stage: 'Sales Qualified (SQL)', score: 92, source: 'Website Inquiry', city: 'Hinjewadi, Pune' },
            { name: 'Rohan Deshmukh', phone: '+91 91234 56789', stage: 'Site Visit Scheduled', score: 95, source: 'Referral', city: 'Baner, Pune' },
            { name: 'Priya Sharma', phone: '+91 90000 11111', stage: 'Contacted', score: 65, source: 'Google Ads', city: 'Magarpatta, Pune' },
            { name: 'Aditya Rao', phone: '+91 99887 76655', stage: 'New', score: 45, source: 'Cold Call', city: 'Wakad, Pune' }
        ];

        for (const lead of demoLeads) {
            const res = await pool.query(
                'INSERT INTO leads (tenant_id, name, phone, email, stage, score, source, city, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
                [tenantId, lead.name, lead.phone, `${lead.name.split(' ')[0].toLowerCase()}@demo.com`, lead.stage, lead.score, lead.source, lead.city, userId]
            );
            const leadId = res.rows[0].id;
            await pool.query("INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note) VALUES ($1, $2, $3, 'Note', NOW(), 'Demo lead created.')", [tenantId, leadId, userId]);
        }

        // Voice Telemetry
        for (let i = 0; i < 30; i++) {
            const date = new Date(Date.now() - Math.random() * 7 * 86400000);
            await pool.query(
                "INSERT INTO interactions (tenant_id, user_id, type, date, duration, outcome, note) VALUES ($1, $2, 'Call', $3, $4, $5, 'Demo call')",
                [tenantId, userId, date, Math.floor(Math.random() * 300) + 20, i % 4 === 0 ? 'Connected' : 'No Answer']
            );
        }

        // WhatsApp
        await pool.query('DELETE FROM whatsapp_campaigns WHERE tenant_id = $1', [tenantId]);
        await pool.query(
            "INSERT INTO whatsapp_campaigns (tenant_id, name, message_body, recipients_count, status, sent_at) VALUES ($1, 'Mega Launch Broadcast', 'Exclusive Preview of Zentrix Highstreet!', 450, 'Completed', NOW())",
            [tenantId]
        );

        // Chatbot
        await pool.query('DELETE FROM chatbot_settings WHERE tenant_id = $1', [tenantId]);
        await pool.query(
            'INSERT INTO chatbot_settings (tenant_id, bot_name, system_prompt, greeting_message, is_active) VALUES ($1, $2, $3, $4, $5)',
            [tenantId, 'Zentra AI', 'Sales assistant for ZentrixCRM.', 'Hello {{name}}! How can I help with your property search?', true]
        );

        console.log('--- V3 Seed Done ---');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seedDemoData();
