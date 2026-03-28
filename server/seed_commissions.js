const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seedCommissions() {
    try {
        const { rows: bookings } = await pool.query('SELECT id, tenant_id FROM bookings');
        console.log(`Found ${bookings.length} bookings. Generating commissions...`);
        
        for (const b of bookings) {
            // Corrected join logic: bookings -> customers -> leads
            const { rows: [info] } = await pool.query(
                `SELECT b.*, l.id as lead_id, l.assigned_to, l.channel_partner_id, l.budget 
                 FROM bookings b 
                 JOIN customers c ON b.customer_id = c.id
                 JOIN leads l ON c.lead_id = l.id 
                 WHERE b.id = $1 AND b.tenant_id = $2`,
                [b.id, b.tenant_id]
            );

            if (!info) {
                console.log(`- Booking ${b.id.slice(0,8)} has no associated lead. skipping.`);
                continue;
            }

            const dealValue = parseFloat(info.total_amount || 0);

            // 1. Internal Commission (Agent) - 1.5%
            if (info.assigned_to) {
                const agentComm = (dealValue * 0.015);
                await pool.query(
                    `INSERT INTO commissions (tenant_id, entity_type, entity_id, lead_id, booking_id, deal_value, commission_rate, payout_amount, status)
                     VALUES ($1, 'Internal', $2, $3, $4, $5, 1.5, $6, 'Pending') ON CONFLICT DO NOTHING`,
                    [b.tenant_id, info.assigned_to, info.lead_id, b.id, dealValue, agentComm]
                );
                console.log(`+ Generated 1.5% Internal for agent ${info.assigned_to.slice(0,8)} | Amount: ${agentComm}`);
            }

            // 2. Channel Partner Commission - 2.0%
            if (info.channel_partner_id) {
                const cpComm = (dealValue * 0.02);
                await pool.query(
                    `INSERT INTO commissions (tenant_id, entity_type, entity_id, lead_id, booking_id, deal_value, commission_rate, payout_amount, status)
                     VALUES ($1, 'Channel Partner', $2, $3, $4, $5, 2.0, $6, 'Pending') ON CONFLICT DO NOTHING`,
                    [b.tenant_id, info.channel_partner_id, info.lead_id, b.id, dealValue, cpComm]
                );
                console.log(`+ Generated 2.0% Partner for CP ${info.channel_partner_id.slice(0,8)} | Amount: ${cpComm}`);
            }
        }
        console.log('✅ Commissions seeded successfully!');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
seedCommissions();
