const pool = require('../db/pool');

async function seedTodayData() {
    const userId = 'a89cb9fe-35e8-4067-ad39-ee7f1da5a181';
    const tenantId = 'f6adcc05-114b-4053-9ee7-27cb8ace8cfa';
    const today = new Date().toISOString().split('T')[0]; // 2026-04-16

    try {
        // 1. Get some leads for this tenant
        const leadsRes = await pool.query(
            'SELECT id, name FROM leads WHERE tenant_id = $1 LIMIT 5',
            [tenantId]
        );

        const leads = leadsRes.rows;
        if (leads.length === 0) {
            console.log('No leads found for this tenant. Cannot seed follow-ups.');
            return;
        }

        console.log(`Found ${leads.length} leads. Seeding follow-ups for today (${today})...`);

        // 2. Insert Follow-ups
        const followups = [
            { lead: leads[0], time: '11:30:00', type: 'Call', note: 'High interest in Zentrix Heights. Review budget.' },
            { lead: leads[1], time: '14:45:00', type: 'WhatsApp', note: 'Send latest site walkthrough video.' },
            { lead: leads[2], time: '16:00:00', type: 'Meeting', note: 'Final negotiation on 3BHK pricing.' },
            { lead: leads[3] || leads[0], time: '18:15:00', type: 'Email', note: 'Send formal proposal document.' }
        ];

        for (const f of followups) {
            const scheduledAt = `${today} ${f.time}`;
            await pool.query(`
                INSERT INTO followups (lead_id, assigned_to, type, scheduled_at, note, status, priority, tenant_id)
                VALUES ($1, $2, $3, $4, $5, 'Pending', 'High', $6)
            `, [f.lead.id, userId, f.type, scheduledAt, f.note, tenantId]);
            console.log(`✅ Seeded: ${f.type} for ${f.lead.name} at ${scheduledAt}`);
        }

        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedTodayData();
