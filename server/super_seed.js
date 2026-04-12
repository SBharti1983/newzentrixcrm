const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function seed() {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        console.log('🚀 Super Seeding Zentrix CRM...');

        // 0. Cleanup duplicates
        await client.query("DELETE FROM users WHERE email = 'demoadmin@zentrix.com'");
        console.log('🧹 Cleaned up existing demo accounts.');

        // 1. Consolidated Tenant
        // We use a static slug 'zentrix' for consistency.
        const { rows: [tenant] } = await client.query(`
            INSERT INTO tenants (name, slug, plan, is_active, settings)
            VALUES ('Zentrix Reality', 'zentrix', 'pro', true, $1)
            ON CONFLICT (slug) DO UPDATE SET is_active = true, settings = $1
            RETURNING id
        `, [{
            features: {
                whatsapp: true,
                marketing: true,
                voice_telemetry: true,
                custom_reports: true,
                automations: true,
                ai_scoring: true
            },
            telephony_secret: 'Zentrix@2026'
        }]);

        const tid = tenant.id;
        console.log(`✅ Tenant ID: ${tid}`);

        // 2. Main Admin User
        const hash = await bcrypt.hash('password123', 10);
        const { rows: [admin] } = await client.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, is_active)
            VALUES ($1, 'Demo Administrator', 'demoadmin@zentrix.com', $2, 'admin', 'DA', true)
            ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $2, is_active = true
            RETURNING id
        `, [tid, hash]);

        const uid = admin.id;
        console.log(`✅ Admin ID: ${uid} (Login: demoadmin@zentrix.com / password123)`);

        // 3. Sample Project
        const { rows: [project] } = await client.query(`
            INSERT INTO projects (tenant_id, name, location, status, total_units, available_units)
            VALUES ($1, 'Zentrix Elite Towers', 'Sector 150, Noida', 'Active', 100, 45)
            RETURNING id
        `, [tid]);
        const pid = project.id;

        // 4. Sample Leads
        const leadsData = [
            { name: 'Sikandar Bharti', phone: '9988776655', email: 'sikandar@example.com' },
            { name: 'Maya Singh', phone: '9811223344', email: 'maya@example.com' },
            { name: 'Rajesh Khanna', phone: '9122334455', email: 'rajesh@example.com' },
            { name: 'Neha Sharma', phone: '9711667788', email: 'neha@example.com' },
            { name: 'Vikram Grover', phone: '9911445566', email: 'vikram@example.com' }
        ];

        const leadIds = [];
        for (const l of leadsData) {
            const { rows: [lead] } = await client.query(`
                INSERT INTO leads (tenant_id, assigned_to, project_id, name, phone, email, stage, score)
                VALUES ($1, $2, $3, $4, $5, $6, 'Contacted', 85)
                RETURNING id
            `, [tid, uid, pid, l.name, l.phone, l.email]);
            leadIds.push(lead.id);
        }
        console.log(`✅ ${leadIds.length} Leads created.`);

        // 5. Sample Interactions (for Reporting)
        console.log('📈 Generating 100+ Interaction Logs...');
        const outcomes = ['Connected', 'Interested', 'Not Reachable', 'Busy', 'Callback Scheduled'];
        const sentiments = ['Highly Positive', 'Positive', 'Neutral', 'Concerned', 'Negative'];
        
        for (let i = 0; i < 100; i++) {
            const leadId = leadIds[i % leadIds.length];
            const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            const duration = Math.floor(Math.random() * 300) + 15; // 15s to 5m
            
            // Scatter dates across the last 14 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 14));
            date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

            await client.query(`
                INSERT INTO interactions (tenant_id, lead_id, user_id, type, outcome, note, duration, date)
                VALUES ($1, $2, $3, 'Call', $4, $5, $6, $7)
            `, [
                tid, leadId, uid, outcome, 
                `Automated audit log for call interaction #${i}. Sentiment: ${sentiment}.`, 
                duration, date
            ]);
        }

        await client.query('COMMIT');
        console.log('🎉 Super Seed Complete! Platform is primed for reporting.');
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Seeding Failed:', err);
    } finally {
        if (client) client.release();
        process.exit();
    }
}

seed();
