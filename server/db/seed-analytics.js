require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seedAnalytics() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('📊 Seeding extended analytics data...');

        // Get the single tenant
        const { rows } = await client.query('SELECT id FROM tenants LIMIT 1');
        if (!rows.length) {
            console.log('No tenant found. Exiting.');
            return;
        }
        const tid = rows[0].id;

        // Spread out existing leads over the last 6 months
        console.log('Backdating existing leads...');
        const { rows: leads } = await client.query('SELECT id FROM leads WHERE tenant_id = $1', [tid]);
        for (let i = 0; i < leads.length; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 180)); // Last 6 months
            await client.query('UPDATE leads SET created_at = $1 WHERE id = $2', [pastDate, leads[i].id]);
        }

        // Add 60 more dummy leads
        console.log('Generating 60 new leads for analytics volume...');
        const { rows: agents } = await client.query('SELECT id FROM users WHERE tenant_id=$1 AND role=$2 OR role=$3', [tid, 'agent', 'sales_manager']);
        const { rows: projects } = await client.query('SELECT id FROM projects WHERE tenant_id=$1', [tid]);

        if (!agents.length || !projects.length) {
            console.log('Need agents and projects to seed leads.');
            return;
        }

        const sources = ['Website', 'Referral', 'Social Media', 'Walk-in', 'PropTech'];
        const stages = ['New', 'Contacted', 'Site Visit', 'Negotiation', 'Won', 'Lost'];
        const types = ['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Commercial'];

        for (let i = 0; i < 60; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 180));
            const source = sources[Math.floor(Math.random() * sources.length)];
            const stage = stages[Math.floor(Math.random() * stages.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const ai = agents[Math.floor(Math.random() * agents.length)].id;
            const pi = projects[Math.floor(Math.random() * projects.length)].id;

            await client.query(`
                INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, score, property_type, budget, project_id, assigned_to, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                tid,
                `Demo Lead ${i}`,
                `+91 90000${String(i).padStart(5, '0')}`,
                `lead${i}@demo.com`,
                ['Mumbai', 'Pune', 'Bangalore', 'Delhi'][Math.floor(Math.random() * 4)],
                source, stage,
                Math.floor(Math.random() * 100),
                type,
                ['₹50L', '₹80L', '₹1Cr', '₹2.5Cr'][Math.floor(Math.random() * 4)],
                pi, ai, pastDate
            ]);
        }

        // Add some random bookings attached to recent months
        console.log('Generating bookings...');
        const plans = ['Down Payment', 'Construction Linked', 'Subvention'];
        const { rows: customers } = await client.query('SELECT id FROM customers WHERE tenant_id=$1 LIMIT 1', [tid]);

        if (!customers.length) {
            console.log('No customers found. Cannot seed bookings.');
            return;
        }

        for (let i = 0; i < 15; i++) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 180));
            const ai = agents[Math.floor(Math.random() * agents.length)].id;
            const pi = projects[Math.floor(Math.random() * projects.length)].id;
            const ci = customers[0].id; // Assign them to the first customer so it goes through
            const amount = Math.floor(Math.random() * 20000000) + 5000000;
            const plan = plans[Math.floor(Math.random() * plans.length)];

            await client.query(`
                INSERT INTO bookings (tenant_id, customer_id, project_id, unit_no, total_amount, token_amount, payment_plan, assigned_agent_id, status, booking_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                tid,
                ci,
                pi,
                `T-${100 + i}`,
                amount,
                amount * 0.05,
                plan,
                ai,
                Math.random() > 0.3 ? 'Confirmed' : 'In Process',
                pastDate.toISOString().split('T')[0]
            ]);
        }

        await client.query('COMMIT');
        console.log('✅ Analytics data successfully seeded!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to seed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

seedAnalytics();
