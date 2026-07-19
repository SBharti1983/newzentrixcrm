/**
 * Seed Maya Infratech Pvt Ltd tenant on Supabase
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('pooler.supabase.com') ? false : { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🏢 Creating Maya Infratech Pvt Ltd...\n');

        // ── Tenant ──
        const { rows: [tenant] } = await client.query(`
            INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, primary_color)
            VALUES ('Maya Infratech Pvt Ltd', 'mayainfratech', 'pro', 15, 5000, 20, '#0d6e3f')
            RETURNING *
        `);
        const tid = tenant.id;
        console.log(`✓ Tenant: ${tenant.name} (${tenant.slug})`);

        // ── Users ──
        const adminHash = await bcrypt.hash('Maya@2026', 12);
        const mgrHash = await bcrypt.hash('Manager@123', 10);
        const agentHash = await bcrypt.hash('Agent@123', 10);

        const { rows: [admin] } = await client.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, is_active)
            VALUES ($1, 'MayaAdmin', 'admin@mayainfratech.in', $2, 'admin', 'MA', '+91 98100 00001', true)
            RETURNING *
        `, [tid, adminHash]);

        const { rows: [mgr] } = await client.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, is_active)
            VALUES ($1, 'Suresh Patel', 'suresh@mayainfratech.in', $2, 'sales_manager', 'SP', '+91 98100 00002', true)
            RETURNING *
        `, [tid, mgrHash]);

        const agents = [];
        const agentData = [
            { name: 'Amit Sharma', email: 'amit@mayainfratech.in', avatar: 'AS', phone: '+91 98100 00003' },
            { name: 'Priya Singh', email: 'priya@mayainfratech.in', avatar: 'PS', phone: '+91 98100 00004' },
            { name: 'Deepak Yadav', email: 'deepak@mayainfratech.in', avatar: 'DY', phone: '+91 98100 00005' },
        ];
        for (const a of agentData) {
            const { rows: [agent] } = await client.query(`
                INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, reports_to, is_active)
                VALUES ($1, $2, $3, $4, 'agent', $5, $6, $7, true) RETURNING *
            `, [tid, a.name, a.email, agentHash, a.avatar, a.phone, mgr.id]);
            agents.push(agent);
        }

        // Set manager reports_to admin
        await client.query('UPDATE users SET reports_to = $1 WHERE id = $2', [admin.id, mgr.id]);
        console.log(`✓ Users: 5 (1 admin, 1 manager, 3 agents)`);

        // ── Projects ──
        const PROJECTS = [
            { name: 'Maya Heights', location: 'Sector 62, Noida', status: 'Active', total: 80, avail: 35, price: '₹55L–₹1.2Cr', amenities: ['Swimming Pool', 'Club House', 'Gym', 'Kids Play Area'] },
            { name: 'Maya Residency', location: 'Greater Noida West', status: 'Active', total: 120, avail: 58, price: '₹35L–₹65L', amenities: ['Jogging Track', 'Garden', 'Security', 'Power Backup'] },
            { name: 'Maya Green Valley', location: 'Yamuna Expressway', status: 'Pre-Launch', total: 200, avail: 200, price: '₹28L–₹50L', amenities: ['Open Spaces', 'Temple', 'Community Hall', 'Shopping Complex'] },
            { name: 'Maya Gold Tower', location: 'Sector 93, Noida', status: 'Active', total: 60, avail: 12, price: '₹1.5Cr–₹3Cr', amenities: ['Concierge', 'Rooftop Lounge', 'Smart Home', 'EV Charging'] },
        ];

        const projRows = [];
        for (const p of PROJECTS) {
            const { rows: [proj] } = await client.query(`
                INSERT INTO projects (tenant_id, name, location, status, total_units, available_units, price_range, amenities)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
            `, [tid, p.name, p.location, p.status, p.total, p.avail, p.price, JSON.stringify(p.amenities)]);
            projRows.push(proj);
        }
        console.log(`✓ Projects: ${projRows.length}`);

        // ── Inventory (sample units) ──
        let invCount = 0;
        for (let pi = 0; pi < 2; pi++) {
            const types = ['2BHK', '3BHK', '4BHK'];
            for (let floor = 1; floor <= 6; floor++) {
                for (let unit = 1; unit <= 3; unit++) {
                    const unitType = types[unit - 1];
                    const basePrice = unitType === '2BHK' ? 5500000 : unitType === '3BHK' ? 8500000 : 12000000;
                    await client.query(`
                        INSERT INTO inventory (tenant_id, project_id, unit_no, floor, area_sqft, property_type, base_price, status)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    `, [tid, projRows[pi].id, `${String.fromCharCode(65+pi)}-${floor}0${unit}`, floor,
                        unitType === '2BHK' ? 1050 : unitType === '3BHK' ? 1450 : 2100,
                        unitType, basePrice + (floor * 100000), unit <= 1 && floor <= 2 ? 'Sold' : 'Available']);
                    invCount++;
                }
            }
        }
        console.log(`✓ Inventory: ${invCount} units`);

        // ── Leads ──
        const rand = arr => arr[Math.floor(Math.random() * arr.length)];
        const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

        const LEADS = [
            { name: 'Rajiv Malhotra', phone: '+91 99001 11001', email: 'rajiv.m@email.com', city: 'Noida', source: 'Website', stage: 'Won', score: 95, type: '3BHK', pi: 0 },
            { name: 'Sunita Aggarwal', phone: '+91 99001 11002', email: 'sunita.a@email.com', city: 'Greater Noida', source: 'Referral', stage: 'Won', score: 90, type: '2BHK', pi: 1 },
            { name: 'Mohit Gupta', phone: '+91 99001 11003', email: 'mohit.g@corp.com', city: 'Ghaziabad', source: 'Walk-in', stage: 'Negotiation', score: 88, type: '4BHK', pi: 3 },
            { name: 'Kavita Saxena', phone: '+91 99001 11004', email: 'kavita.s@email.com', city: 'Noida', source: 'Google Ads', stage: 'Site Visit', score: 82, type: '3BHK', pi: 0 },
            { name: 'Anil Tiwari', phone: '+91 99001 11005', email: 'anil.t@email.com', city: 'Delhi', source: 'PropTech Portal', stage: 'Site Visit', score: 78, type: '2BHK', pi: 1 },
            { name: 'Meera Jain', phone: '+91 99001 11006', email: 'meera.j@gmail.com', city: 'Noida', source: 'Referral', stage: 'Contacted', score: 72, type: '3BHK', pi: 0 },
            { name: 'Ravi Bhatia', phone: '+91 99001 11007', email: 'ravi.b@email.com', city: 'Lucknow', source: 'Website', stage: 'Contacted', score: 68, type: '2BHK', pi: 1 },
            { name: 'Neha Kapoor', phone: '+91 99001 11008', email: 'neha.k@email.com', city: 'Noida', source: 'Social Media', stage: 'Contacted', score: 65, type: '3BHK', pi: 2 },
            { name: 'Ashish Mishra', phone: '+91 99001 11009', email: 'ashish.m@email.com', city: 'Gurgaon', source: 'Walk-in', stage: 'New', score: 60, type: '4BHK', pi: 3 },
            { name: 'Pooja Verma', phone: '+91 99001 11010', email: 'pooja.v@email.com', city: 'Noida', source: 'Google Ads', stage: 'New', score: 55, type: '2BHK', pi: 1 },
            { name: 'Sudhir Chauhan', phone: '+91 99001 11011', email: 'sudhir.c@email.com', city: 'Faridabad', source: 'Website', stage: 'New', score: 52, type: '3BHK', pi: 2 },
            { name: 'Rekha Pandey', phone: '+91 99001 11012', email: 'rekha.p@email.com', city: 'Noida', source: 'Social Media', stage: 'New', score: 48, type: '2BHK', pi: 1 },
            { name: 'Vinod Sharma', phone: '+91 99001 11013', email: 'vinod.s@email.com', city: 'Meerut', source: 'PropTech Portal', stage: 'New', score: 45, type: '2BHK', pi: 2 },
            { name: 'Lalita Devi', phone: '+91 99001 11014', email: 'lalita.d@email.com', city: 'Agra', source: 'Referral', stage: 'Lost', score: 30, type: '2BHK', pi: 1 },
            { name: 'Pankaj Dubey', phone: '+91 99001 11015', email: 'pankaj.d@email.com', city: 'Noida', source: 'Website', stage: 'Lost', score: 25, type: '3BHK', pi: 0 },
        ];

        const leadRows = [];
        for (const l of LEADS) {
            const priority = l.score >= 80 ? 'High' : l.score >= 60 ? 'Medium' : 'Low';
            const { rows: [row] } = await client.query(`
                INSERT INTO leads (tenant_id, assigned_to, name, phone, email, city, source, stage, score, priority, property_type, project_id, budget, last_contact_at, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
            `, [tid, agents[randInt(0, 2)].id, l.name, l.phone, l.email, l.city, l.source, l.stage,
                l.score, priority, l.type, projRows[l.pi].id,
                l.type === '4BHK' ? '₹1.5Cr' : l.type === '3BHK' ? '₹85L' : '₹45L',
                daysAgo(randInt(1, 15)), daysAgo(randInt(5, 45))]);
            leadRows.push(row);
        }
        console.log(`✓ Leads: ${leadRows.length}`);

        // ── Followups ──
        const FU_TYPES = ['Call', 'WhatsApp', 'Meeting', 'Site Visit', 'Email'];
        let fuCount = 0;
        for (let i = 0; i < 20; i++) {
            const lead = leadRows[i % leadRows.length];
            const dOffset = randInt(-5, 10);
            const dt = new Date(); dt.setDate(dt.getDate() + dOffset);
            await client.query(`
                INSERT INTO followups (tenant_id, lead_id, assigned_to, type, priority, scheduled_at, status, note)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `, [tid, lead.id, lead.assigned_to, rand(FU_TYPES),
                rand(['High', 'Medium', 'Low']), dt,
                dOffset < 0 ? rand(['Completed', 'Missed']) : 'Pending',
                `Follow up with ${lead.name} regarding ${rand(['site visit', 'pricing', 'payment plan', 'documentation'])}`]);
            fuCount++;
        }
        console.log(`✓ Followups: ${fuCount}`);

        // ── Interactions ──
        let intCount = 0;
        for (const lead of leadRows.slice(0, 8)) {
            for (let j = 0; j < randInt(1, 3); j++) {
                await client.query(`
                    INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, duration, note, outcome)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                `, [tid, lead.id, lead.assigned_to, rand(['Call', 'Note', 'Message']),
                    daysAgo(randInt(1, 20)), randInt(30, 300),
                    `Discussed ${rand(['pricing', 'floor plan', 'possession date', 'payment options'])} with ${lead.name}`,
                    rand(['Interested', 'Follow-up', 'Callback', 'Connected'])]);
                intCount++;
            }
        }
        console.log(`✓ Interactions: ${intCount}`);

        // ── Notifications (Strategic Command Data) ───────────────────
        let msgCount = 0;
        for (const lead of leadRows.slice(0, 5)) {
            const isSentByAgent = Math.random() > 0.4;
            await client.query(`
                INSERT INTO notifications (tenant_id, lead_id, sent_by, channel, recipient, body, status, sent_at)
                VALUES ($1, $2, $3, 'WhatsApp', $4, $5, 'Delivered', $6)
            `, [tid, lead.id, isSentByAgent ? lead.assigned_to : null, lead.phone,
                isSentByAgent 
                    ? `Greeting from Maya Infratech! We have some exclusive offers on ${lead.property_type} units this week.`
                    : `Thanks for the update. Please share the revised price list.`,
                daysAgo(randInt(1, 5))]);
            msgCount++;
        }
        console.log(`✓ Notifications: ${msgCount} social messages created`);

        // ── Customers + Bookings (from Won leads) ──
        const wonLeads = leadRows.filter(l => l.stage === 'Won');
        for (let i = 0; i < wonLeads.length; i++) {
            const lead = wonLeads[i];
            const { rows: [cust] } = await client.query(`
                INSERT INTO customers (tenant_id, lead_id, name, email, phone, city)
                VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
            `, [tid, lead.id, lead.name, lead.email, lead.phone, lead.city]);

            await client.query(`
                INSERT INTO bookings (tenant_id, customer_id, project_id, unit_no, assigned_agent_id, total_amount, payment_plan, status, booking_date)
                VALUES ($1,$2,$3,$4,$5,$6,$7,'Confirmed',CURRENT_DATE - interval '10 days')
            `, [tid, cust.id, lead.project_id, `A-${i+1}0${i+1}`, lead.assigned_to,
                lead.property_type === '3BHK' ? 8500000 : 5500000, 'Construction Linked']);
        }
        console.log(`✓ Customers & Bookings: ${wonLeads.length}`);

        await client.query('COMMIT');

        console.log('\n═══════════════════════════════════════════════');
        console.log('🎉 Maya Infratech tenant created successfully!');
        console.log('═══════════════════════════════════════════════');
        console.log(`  Tenant:     ${tenant.name}`);
        console.log(`  Slug:       ${tenant.slug}`);
        console.log(`  Projects:   ${projRows.length}`);
        console.log(`  Leads:      ${leadRows.length}`);
        console.log(`  Inventory:  ${invCount} units`);
        console.log('');
        console.log('📋 Login: admin@mayainfratech.in / Maya@2026');
        console.log('═══════════════════════════════════════════════\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', err.message);
        console.error(err.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
