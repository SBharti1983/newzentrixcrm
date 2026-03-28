/**
 * ZentrixCRM — Database Seed
 * Populates Demo Tenant + Users + Projects + Leads + Bookings etc.
 * Run: node db/seed.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🌱 Seeding demo data...\n');

        // ── Tenant ─────────────────────────────────────────────────
        const { rows: [tenant] } = await client.query(`
            INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, is_active)
            VALUES ('Zentrix Realty', 'zentrix', 'pro', 10, 5000, 20, TRUE)
            ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
            RETURNING *
        `);
        let tid = tenant?.id;
        if (!tid) {
            const { rows } = await client.query(`SELECT id FROM tenants WHERE slug='zentrix'`);
            tid = rows[0]?.id;
            console.log('Tenant already exists, ensuring users are updated');
        } else {
            console.log(`✓ Tenant: ${tenant.name} (${tid})`);
        }

        // ── Users ──────────────────────────────────────────────────
        const pwHash = await bcrypt.hash('Admin@123', 10);
        
        // Users array will handle all insertions below
        const agentHash = await bcrypt.hash('Agent@123', 10);
        const mgrHash = await bcrypt.hash('Manager@123', 10);

        const users = [
            { name: 'Arjun Sharma', email: 'arjun@zentrix.com', hash: pwHash, role: 'admin', avatar: 'AS' },
            { name: 'Priya Mehta', email: 'priya@zentrix.com', hash: mgrHash, role: 'sales_manager', avatar: 'PM' },
            { name: 'Rohan Verma', email: 'rohan@zentrix.com', hash: agentHash, role: 'agent', avatar: 'RV' },
            { name: 'Neha Gupta', email: 'neha@zentrix.com', hash: agentHash, role: 'agent', avatar: 'NG' },
            { name: 'Vikram Singh', email: 'vikram@zentrix.com', hash: agentHash, role: 'agent', avatar: 'VS' },
        ];

        const userIds = [];
        for (const u of users) {
            const { rows: [user] } = await client.query(`
                INSERT INTO users (tenant_id, name, email, password_hash, role, avatar)
                VALUES ($1,$2,$3,$4,$5,$6) 
                ON CONFLICT (tenant_id, email) DO UPDATE 
                SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
                RETURNING id
            `, [tid, u.name, u.email, u.hash, u.role, u.avatar]);
            userIds.push(user.id);
        }
        console.log(`✓ Users: ${users.length} created`);

        // ── Projects ───────────────────────────────────────────────
        const projects = [
            { name: 'Zentrix Heights', location: 'Andheri West, Mumbai', status: 'Active', total: 120, avail: 34, price: '₹75L–₹1.2Cr' },
            { name: 'Zentrix Residences', location: 'Whitefield, Bangalore', status: 'Active', total: 80, avail: 18, price: '₹90L–₹1.5Cr' },
            { name: 'Zentrix Park', location: 'Hinjewadi, Pune', status: 'Active', total: 200, avail: 72, price: '₹45L–₹80L' },
            { name: 'Zentrix Villas', location: 'Jubilee Hills, Hyderabad', status: 'Active', total: 40, avail: 12, price: '₹1.5Cr–₹3Cr' },
            { name: 'Zentrix Lite', location: 'OMR, Chennai', status: 'Active', total: 150, avail: 89, price: '₹35L–₹55L' },
            { name: 'Zentrix Elite', location: 'Golf Course Rd, Gurgaon', status: 'Pre-Launch', total: 60, avail: 60, price: '₹2Cr–₹5Cr' },
            { name: 'Zentrix Grande', location: 'Baner, Pune', status: 'Completed', total: 100, avail: 0, price: '₹55L–₹95L' },
        ];

        const projIds = [];
        for (const p of projects) {
            const { rows: [proj] } = await client.query(`
                INSERT INTO projects (tenant_id, name, location, status, total_units, available_units, price_range)
                VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
            `, [tid, p.name, p.location, p.status, p.total, p.avail, p.price]);
            projIds.push(proj.id);
        }
        console.log(`✓ Projects: ${projects.length} created`);

        // ── Leads ──────────────────────────────────────────────────
        const leadsData = [
            { name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh.kumar@email.com', city: 'Mumbai', source: 'Website', stage: 'New', score: 78, type: '3BHK', budget: '₹85L', pi: 0, ai: 2 },
            { name: 'Anita Patel', phone: '+91 99887 65432', email: 'anita.patel@gmail.com', city: 'Bangalore', source: 'Referral', stage: 'Contacted', score: 92, type: '4BHK', budget: '₹1.2Cr', pi: 1, ai: 3 },
            { name: 'Suresh Bhat', phone: '+91 76543 21098', email: 'suresh.bhat@hotmail.com', city: 'Pune', source: 'Social Media', stage: 'Qualified', score: 65, type: '2BHK', budget: '₹60L', pi: 2, ai: 2 },
            { name: 'Divya Nair', phone: '+91 88776 65543', email: 'divya.nair@yahoo.com', city: 'Mumbai', source: 'Walk-in', stage: 'Negotiation', score: 88, type: '3BHK', budget: '₹95L', pi: 0, ai: 3 },
            { name: 'Kiran Reddy', phone: '+91 70998 87665', email: 'kiran.reddy@outlook.com', city: 'Hyderabad', source: 'PropTech Portal', stage: 'Won', score: 95, type: 'Villa', budget: '₹1.5Cr', pi: 3, ai: 4 },
            { name: 'Priti Shah', phone: '+91 80001 23456', email: 'priti.shah@email.com', city: 'Ahmedabad', source: 'Social Media', stage: 'Site Visit', score: 62, type: '3BHK', budget: '₹80L', pi: 0, ai: 2 },
            { name: 'Arun Kapoor', phone: '+91 91234 56789', email: 'arun.kapoor@gmail.com', city: 'Mumbai', source: 'Walk-in', stage: 'Nurture', score: 85, type: 'Penthouse', budget: '₹2Cr', pi: 5, ai: 3 },
            { name: 'Dev Malhotra', phone: '+91 82345 67890', email: 'dev.malhotra@email.com', city: 'Delhi', source: 'PropTech Portal', stage: 'Disqualified', score: 20, type: '4BHK', budget: '₹1.1Cr', pi: 1, ai: 4 },
            { name: 'Sunita Joshi', phone: '+91 73456 78901', email: 'sunita.joshi@yahoo.com', city: 'Pune', source: 'Referral', stage: 'New', score: 55, type: '1BHK', budget: '₹45L', pi: 4, ai: 2 },
            { name: 'Amit Trivedi', phone: '+91 64567 89012', email: 'amit.trivedi@gmail.com', city: 'Surat', source: 'Website', stage: 'Lost', score: 30, type: '2BHK', budget: '₹55L', pi: 4, ai: 3 },
        ];

        const leadIds = [];
        for (const l of leadsData) {
            const { rows: [lead] } = await client.query(`
                INSERT INTO leads (tenant_id, assigned_to, name, phone, email, city, source, stage, score, property_type, project_id, budget, last_contact_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW() - INTERVAL '${Math.floor(Math.random() * 10) + 1} days')
                RETURNING id
            `, [tid, userIds[l.ai], l.name, l.phone, l.email, l.city, l.source, l.stage, l.score, l.type, projIds[l.pi], l.budget]);
            leadIds.push(lead.id);
        }
        console.log(`✓ Leads: ${leadsData.length} created`);

        // ── Customers ─────────────────────────────────────────────
        const wonLead = leadsData.findIndex(l => l.stage === 'Won');
        const { rows: [cust1] } = await client.query(`
            INSERT INTO customers (tenant_id, lead_id, name, email, phone, city)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
        `, [tid, leadIds[wonLead], leadsData[wonLead].name, leadsData[wonLead].email, leadsData[wonLead].phone, leadsData[wonLead].city]);

        const { rows: [cust2] } = await client.query(`
            INSERT INTO customers (tenant_id, name, email, phone, city) VALUES ($1,'Anita Patel','anita.patel@gmail.com','+91 99887 65432','Bangalore') RETURNING id
        `, [tid]);

        const { rows: [cust3] } = await client.query(`
            INSERT INTO customers (tenant_id, name, email, phone, city) VALUES ($1,'Divya Nair','divya.nair@yahoo.com','+91 88776 65543','Mumbai') RETURNING id
        `, [tid]);
        console.log(`✓ Customers: 3 created`);

        // ── Bookings ──────────────────────────────────────────────
        const bookingsData = [
            { cid: cust1.id, pid: projIds[3], unit: 'V-002', agent: userIds[4], amount: 15000000, plan: 'Construction Linked', status: 'Confirmed', token: 750000 },
            { cid: cust2.id, pid: projIds[1], unit: 'B-401', agent: userIds[3], amount: 12000000, plan: 'Down Payment', status: 'Pending Docs', token: 600000 },
            { cid: cust3.id, pid: projIds[0], unit: 'H-1204', agent: userIds[2], amount: 9500000, plan: 'EMI', status: 'Confirmed', token: 500000 },
        ];

        const bookingIds = [];
        for (const b of bookingsData) {
            const { rows: [bk] } = await client.query(`
                INSERT INTO bookings (tenant_id, customer_id, project_id, unit_no, assigned_agent_id, total_amount, payment_plan, status, token_amount, token_collected, token_date, token_mode)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE, CURRENT_DATE - 10, 'NEFT/RTGS') RETURNING id
            `, [tid, b.cid, b.pid, b.unit, b.agent, b.amount, b.plan, b.status, b.token]);
            bookingIds.push(bk.id);
        }
        console.log(`✓ Bookings: ${bookingsData.length} created`);

        // ── Installments ──────────────────────────────────────────
        const installments = [
            { bi: 0, milestone: 'Token Amount', pct: 5, days: -10, status: 'Paid', receipt: 'RCP-2026-001' },
            { bi: 0, milestone: 'Booking Amount', pct: 10, days: 20, status: 'Upcoming', receipt: null },
            { bi: 0, milestone: 'Foundation Complete', pct: 15, days: 90, status: 'Upcoming', receipt: null },
            { bi: 0, milestone: 'Plinth Level', pct: 10, days: 180, status: 'Upcoming', receipt: null },
            { bi: 1, milestone: 'Down Payment', pct: 30, days: -5, status: 'Paid', receipt: 'RCP-2026-002' },
            { bi: 1, milestone: '30 Days Installment', pct: 30, days: 25, status: 'Upcoming', receipt: null },
            { bi: 1, milestone: 'Possession Amount', pct: 40, days: -30, status: 'Overdue', receipt: null },
            { bi: 2, milestone: 'Token', pct: 5, days: -15, status: 'Paid', receipt: 'RCP-2026-003' },
            { bi: 2, milestone: 'EMI 1', pct: 5, days: 0, status: 'Upcoming', receipt: null },
            { bi: 2, milestone: 'EMI 2', pct: 5, days: 30, status: 'Upcoming', receipt: null },
        ];

        const planIds = [];
        for (let i = 0; i < bookingIds.length; i++) {
            const booking = bookingsData[i];
            const { rows: [plan] } = await client.query(`
                INSERT INTO payment_plans (tenant_id, booking_id, plan_name, total_amount)
                VALUES ($1,$2,$3,$4) RETURNING id
            `, [tid, bookingIds[i], booking.plan, booking.amount]);
            planIds.push(plan.id);
        }

        for (const inst of installments) {
            const amount = (bookingsData[inst.bi].amount * inst.pct) / 100;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + inst.days);
            const paidDate = inst.status === 'Paid' ? dueDate : null;
            await client.query(`
                INSERT INTO installments (tenant_id, payment_plan_id, booking_id, milestone, amount, percentage, due_date, paid_date, status, receipt_no)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            `, [tid, planIds[inst.bi], bookingIds[inst.bi], inst.milestone, amount, inst.pct,
                dueDate.toISOString().split('T')[0],
                paidDate ? paidDate.toISOString().split('T')[0] : null,
                inst.status, inst.receipt]);
        }
        console.log(`✓ Installments: ${installments.length} created`);

        // ── Follow-ups ─────────────────────────────────────────────
        const followupDates = [-2, -2, -1, 3, 5, 6, 6, 7, 10, 25].map(d => {
            const dt = new Date();
            dt.setDate(dt.getDate() + d);
            return dt;
        });

        const followupsData = [
            { li: 0, ai: 2, type: 'Call', status: 'Pending', priority: 'High', note: 'Interested in 3BHK, awaiting site visit', di: 0 },
            { li: 2, ai: 2, type: 'Site Visit', status: 'Pending', priority: 'High', note: 'Schedule site visit to Zentrix Park', di: 1 },
            { li: 5, ai: 2, type: 'Call', status: 'Pending', priority: 'Medium', note: 'Follow up on Heights visit', di: 2 },
            { li: 6, ai: 3, type: 'Email', status: 'Pending', priority: 'Low', note: 'Send brochure for Zentrix Elite penthouse', di: 3 },
            { li: 7, ai: 3, type: 'Meeting', status: 'Pending', priority: 'High', note: 'Final negotiation meeting', di: 4 },
            { li: 8, ai: 2, type: 'WhatsApp', status: 'Completed', priority: 'Low', note: 'WhatsApp catalog sent', di: 5 },
            { li: 3, ai: 3, type: 'Call', status: 'Pending', priority: 'High', note: 'Negotiate price reduction for Divya Nair', di: 6 },
            { li: 1, ai: 3, type: 'Call', status: 'Completed', priority: 'Medium', note: 'Confirmed interest in Residences', di: 7 },
            { li: 0, ai: 2, type: 'Email', status: 'Pending', priority: 'Low', note: 'Send loan options PDF', di: 8 },
            { li: 9, ai: 3, type: 'Call', status: 'Pending', priority: 'Medium', note: 'Attempt to re-engage lost lead', di: 9 },
        ];

        for (const f of followupsData) {
            const dt = followupDates[f.di];
            await client.query(`
                INSERT INTO followups (tenant_id, lead_id, assigned_to, type, priority, scheduled_at, status, note)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `, [tid, leadIds[f.li], userIds[f.ai], f.type, f.priority, dt, f.status, f.note]);
        }
        console.log(`✓ Follow-ups: ${followupsData.length} created`);

        // ── Site Visits ────────────────────────────────────────────
        const svDates = [-5, -1, 3, 6, 10].map(d => {
            const dt = new Date();
            dt.setDate(dt.getDate() + d);
            dt.setHours(10);
            return dt;
        });

        const siteVisitsData = [
            { li: 1, ai: 3, pi: 1, transport: 'Agent Car', status: 'Completed', di: 0 },
            { li: 2, ai: 2, pi: 2, transport: 'Agent Car', status: 'Scheduled', di: 1 },
            { li: 5, ai: 2, pi: 0, transport: 'Own Vehicle', status: 'Scheduled', di: 2 },
            { li: 6, ai: 3, pi: 5, transport: 'Company Cab', status: 'Scheduled', di: 3 },
            { li: 3, ai: 3, pi: 0, transport: 'Agent Car', status: 'Scheduled', di: 4 },
        ];

        for (const s of siteVisitsData) {
            await client.query(`
                INSERT INTO site_visits (tenant_id, lead_id, assigned_agent, project_id, scheduled_at, transport, status)
                VALUES ($1,$2,$3,$4,$5,$6,$7)
            `, [tid, leadIds[s.li], userIds[s.ai], projIds[s.pi], svDates[s.di], s.transport, s.status]);
        }
        console.log(`✓ Site visits: ${siteVisitsData.length} created`);

        // ── Channel Partners ───────────────────────────────────────
        const partners = [
            { name: 'Deepak Realtors', company: 'Deepak Real Estate', email: 'deepak@deepakrealty.com', phone: '+91 98001 23456', city: 'Mumbai', rera: 'MH-RERA-A51800001234', rate: 2.5, leads: 12, bookings: 3, comm: 487500 },
            { name: 'Sunanda Properties', company: 'Sunanda Prop Pvt Ltd', email: 'info@sunandaprop.com', phone: '+91 97002 34567', city: 'Pune', rera: 'MH-RERA-A51900005678', rate: 2.0, leads: 8, bookings: 2, comm: 190000 },
            { name: 'Kumar Associates', company: 'Kumar Associates', email: 'rk@kumarassoc.in', phone: '+91 96003 45678', city: 'Bangalore', rera: 'KA-RERA-PRJ-20230001', rate: 2.0, leads: 5, bookings: 1, comm: 90000 },
        ];

        for (const p of partners) {
            await client.query(`
                INSERT INTO channel_partners (tenant_id, name, company, email, phone, city, rera_number, commission_rate, total_leads_referred, total_bookings, total_commission)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            `, [tid, p.name, p.company, p.email, p.phone, p.city, p.rera, p.rate, p.leads, p.bookings, p.comm]);
        }
        console.log(`✓ Channel partners: ${partners.length} created`);

        // ── Subscription ───────────────────────────────────────────
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        await client.query(`
            INSERT INTO subscriptions (tenant_id, plan, status, amount, currency, billing_cycle, expires_at)
            VALUES ($1,'pro','active',4999,'INR','monthly',$2)
        `, [tid, expiresAt]);
        console.log(`✓ Subscription: pro plan seeded`);

        await client.query('COMMIT');
        console.log('\n🎉 Seed complete! Demo data is ready.');
        console.log('\n📋 Login credentials:');
        console.log('   Admin:   arjun@zentrix.com   / Admin@123');
        console.log('   Manager: priya@zentrix.com   / Manager@123');
        console.log('   Agent:   rohan@zentrix.com   / Agent@123');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(process.exit);
