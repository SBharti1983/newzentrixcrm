/**
 * ZentrixCRM — Rich Demo Data Seeder
 * Run: node db/seedRich.js
 * Clears and re-seeds with 30+ leads, bookings, installments, etc.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const poolConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function seedRich() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Clear all tenant data ──────────────────────────────────
        console.log('🧹 Clearing old data...');
        await client.query(`DELETE FROM automation_logs`);
        await client.query(`DELETE FROM workflows`);
        await client.query(`DELETE FROM activity_log`);
        await client.query(`DELETE FROM notifications`);
        await client.query(`DELETE FROM documents`);
        await client.query(`DELETE FROM installments`);
        await client.query(`DELETE FROM payment_plans`);
        await client.query(`DELETE FROM bookings`);
        await client.query(`DELETE FROM site_visits`);
        await client.query(`DELETE FROM followups`);
        await client.query(`DELETE FROM enquiries`);
        await client.query(`DELETE FROM leads`);
        await client.query(`DELETE FROM inventory`);
        await client.query(`DELETE FROM customers`);
        await client.query(`DELETE FROM channel_partners`);
        await client.query(`DELETE FROM subscriptions`);
        await client.query(`DELETE FROM refresh_tokens`);
        await client.query(`DELETE FROM users`);
        await client.query(`DELETE FROM projects`);
        await client.query(`DELETE FROM tenants`);
        console.log('✓ Tables cleared\n');

        // ── Tenant ──────────────────────────────────────────────────
        const { rows: [tenant] } = await client.query(`
            INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, primary_color)
            VALUES ('Zentrix Realty Pvt. Ltd.', 'zentrix', 'pro', 20, 10000, 50, '#1e3a73')
            RETURNING *
        `);
        const tid = tenant.id;
        console.log(`✓ Tenant: ${tenant.name}`);

        // ── Users ────────────────────────────────────────────────────
        const pwHashes = {
            admin: await bcrypt.hash('Admin@123', 10),
            manager: await bcrypt.hash('Manager@123', 10),
            agent: await bcrypt.hash('Agent@123', 10),
        };

        const USERS = [
            { name: 'Arjun Sharma', email: 'arjun@zentrix.com', hash: pwHashes.admin, role: 'admin', avatar: 'AS', phone: '+91 98765 00001', dept: 'Management' },
            { name: 'Priya Mehta', email: 'priya@zentrix.com', hash: pwHashes.manager, role: 'sales_manager', avatar: 'PM', phone: '+91 98765 00002', dept: 'Sales' },
            { name: 'Rohan Verma', email: 'rohan@zentrix.com', hash: pwHashes.agent, role: 'agent', avatar: 'RV', phone: '+91 98765 00003', dept: 'Sales' },
            { name: 'Neha Gupta', email: 'neha@zentrix.com', hash: pwHashes.agent, role: 'agent', avatar: 'NG', phone: '+91 98765 00004', dept: 'Sales' },
            { name: 'Vikram Singh', email: 'vikram@zentrix.com', hash: pwHashes.agent, role: 'agent', avatar: 'VS', phone: '+91 98765 00005', dept: 'Sales' },
            { name: 'Kavita Rao', email: 'kavita@zentrix.com', hash: pwHashes.agent, role: 'agent', avatar: 'KR', phone: '+91 98765 00006', dept: 'Sales' },
        ];

        const userRows = [];
        for (const u of USERS) {
            const { rows: [row] } = await client.query(`
                INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, department)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
            `, [tid, u.name, u.email, u.hash, u.role, u.avatar, u.phone, u.dept]);
            userRows.push(row);
        }
        console.log(`✓ Users: ${userRows.length} created`);

        const agents = userRows.filter(u => u.role === 'agent');

        // ── Projects ─────────────────────────────────────────────────
        const PROJECTS = [
            { name: 'Zentrix Heights', location: 'Andheri West, Mumbai', status: 'Active', total: 120, avail: 34, price: '₹75L–₹1.2Cr', rera: 'P51800028374', amenities: ['Swimming Pool', 'Gym', 'Clubhouse', '24x7 Security', 'Power Backup'] },
            { name: 'Zentrix Residences', location: 'Whitefield, Bangalore', status: 'Active', total: 80, avail: 18, price: '₹90L–₹1.5Cr', rera: 'PRM/KA/RERA/1251/446/PR/201105/003226', amenities: ['Rooftop Terrace', 'Gym', 'EV Charging', 'Co-working Space'] },
            { name: 'Zentrix Park', location: 'Hinjewadi, Pune', status: 'Active', total: 200, avail: 72, price: '₹45L–₹80L', rera: 'P52100027898', amenities: ['Jogging Track', 'Children Play Area', 'Community Hall'] },
            { name: 'Zentrix Villas', location: 'Jubilee Hills, Hyderabad', status: 'Active', total: 40, avail: 12, price: '₹1.5Cr–₹3Cr', rera: 'P01100004697', amenities: ['Private Pool', 'Home Theatre', 'Smart Home', 'Landscape Garden'] },
            { name: 'Zentrix Lite', location: 'OMR, Chennai', status: 'Active', total: 150, avail: 89, price: '₹35L–₹55L', rera: 'TN/29/Building/0001/2022', amenities: ['Gym', 'Park', 'CCTV Surveillance'] },
            { name: 'Zentrix Elite', location: 'Golf Course Rd, Gurgaon', status: 'Pre-Launch', total: 60, avail: 60, price: '₹2Cr–₹5Cr', rera: 'GGM/727/459/2024/40', amenities: ['Concierge', 'Spa', 'Helipad', 'Smart Home'] },
            { name: 'Zentrix Grande', location: 'Baner, Pune', status: 'Completed', total: 100, avail: 0, price: '₹55L–₹95L', rera: 'P52100018912', amenities: ['Gym', 'Swimming Pool', 'Amphitheatre'] },
        ];

        const projRows = [];
        for (const p of PROJECTS) {
            const { rows: [row] } = await client.query(`
                INSERT INTO projects (tenant_id, name, location, status, total_units, available_units, price_range, rera_number, amenities, possession_date)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
            `, [tid, p.name, p.location, p.status, p.total, p.avail, p.price, p.rera,
                JSON.stringify(p.amenities), daysFromNow(randInt(180, 720)).toISOString().split('T')[0]]);
            projRows.push(row);
        }
        console.log(`✓ Projects: ${projRows.length} created`);

        // ── Inventory ───────────────────────────────────────────────
        const unitTypes = ['1BHK', '2BHK', '3BHK', '4BHK'];
        const unitStatuses = ['Available', 'Available', 'Available', 'Booked', 'Sold'];
        const facings = ['East', 'West', 'North', 'South', 'North-East'];
        let inventoryRows = [];

        for (let pi = 0; pi < 3; pi++) {
            const proj = projRows[pi];
            for (let floor = 1; floor <= 8; floor++) {
                for (let unit = 1; unit <= 4; unit++) {
                    const unitNo = `${String.fromCharCode(65 + pi)}${floor.toString().padStart(2, '0')}${unit.toString().padStart(2, '0')}`;
                    const type = unitTypes[unit - 1];
                    const basePrice = type === '1BHK' ? 4500000 : type === '2BHK' ? 6800000 : type === '3BHK' ? 9500000 : 14000000;
                    const status = rand(unitStatuses);
                    const { rows: [inv] } = await client.query(`
                        INSERT INTO inventory (tenant_id, project_id, unit_no, floor, area_sqft, property_type, facing, base_price, status)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
                    `, [tid, proj.id, unitNo, floor, randInt(650, 2200), type, rand(facings), basePrice + randInt(0, 500000), status]);
                    if (status === 'Available') inventoryRows.push(inv.id);
                }
            }
        }
        console.log(`✓ Inventory: ${3 * 8 * 4} units created`);

        // ── Leads (30 rich leads) ────────────────────────────────────
        const LEADS = [
            // Won leads
            { name: 'Kiran Reddy', phone: '+91 70998 87665', email: 'kiran.reddy@outlook.com', city: 'Hyderabad', source: 'PropTech Portal', stage: 'Won', score: 95, type: 'Villa', pi: 3, ai: 0, budget: '₹1.5Cr', lc: 2 },
            { name: 'Meera Krishnan', phone: '+91 81234 56780', email: 'meera.k@gmail.com', city: 'Bangalore', source: 'Referral', stage: 'Won', score: 91, type: '3BHK', pi: 1, ai: 1, budget: '₹1.1Cr', lc: 5 },
            { name: 'Sanjay Khanna', phone: '+91 91122 33445', email: 'sanjay.khanna@corp.in', city: 'Mumbai', source: 'Website', stage: 'Won', score: 88, type: '4BHK', pi: 0, ai: 2, budget: '₹1.2Cr', lc: 3 },
            // Negotiation
            { name: 'Divya Nair', phone: '+91 88776 65543', email: 'divya.nair@yahoo.com', city: 'Mumbai', source: 'Walk-in', stage: 'Negotiation', score: 88, type: '3BHK', pi: 0, ai: 3, budget: '₹95L', lc: 1 },
            { name: 'Dev Malhotra', phone: '+91 82345 67890', email: 'dev.malhotra@email.com', city: 'Delhi', source: 'PropTech Portal', stage: 'Negotiation', score: 84, type: '4BHK', pi: 1, ai: 4, budget: '₹1.1Cr', lc: 2 },
            { name: 'Farida Sheikh', phone: '+91 90011 22334', email: 'farida.sheikh@biz.com', city: 'Ahmedabad', source: 'Referral', stage: 'Negotiation', score: 82, type: 'Penthouse', pi: 5, ai: 5, budget: '₹2.5Cr', lc: 1 },
            { name: 'Rohit Bhatnagar', phone: '+91 79900 11223', email: 'rohit.b@startup.io', city: 'Pune', source: 'Social Media', stage: 'Negotiation', score: 79, type: '3BHK', pi: 2, ai: 3, budget: '₹80L', lc: 3 },
            // Site Visit
            { name: 'Anita Patel', phone: '+91 99887 65432', email: 'anita.patel@gmail.com', city: 'Bangalore', source: 'Referral', stage: 'Site Visit', score: 92, type: '4BHK', pi: 1, ai: 3, budget: '₹1.2Cr', lc: 1 },
            { name: 'Suresh Bhat', phone: '+91 76543 21098', email: 'suresh.bhat@hotmail.com', city: 'Pune', source: 'Social Media', stage: 'Site Visit', score: 65, type: '2BHK', pi: 2, ai: 2, budget: '₹60L', lc: 4 },
            { name: 'Priti Shah', phone: '+91 80001 23456', email: 'priti.shah@email.com', city: 'Ahmedabad', source: 'Social Media', stage: 'Site Visit', score: 62, type: '3BHK', pi: 0, ai: 2, budget: '₹80L', lc: 3 },
            { name: 'Lalit Desai', phone: '+91 88900 12345', email: 'lalit.desai@mnc.com', city: 'Mumbai', source: 'PropTech Portal', stage: 'Site Visit', score: 76, type: '4BHK', pi: 0, ai: 5, budget: '₹1.1Cr', lc: 2 },
            { name: 'Pooja Iyer', phone: '+91 77800 23456', email: 'pooja.iyer@tech.com', city: 'Bangalore', source: 'Website', stage: 'Site Visit', score: 70, type: '2BHK', pi: 1, ai: 5, budget: '₹70L', lc: 5 },
            // Contacted
            { name: 'Arun Kapoor', phone: '+91 91234 56789', email: 'arun.kapoor@gmail.com', city: 'Mumbai', source: 'Walk-in', stage: 'Contacted', score: 85, type: 'Penthouse', pi: 5, ai: 3, budget: '₹2Cr', lc: 2 },
            { name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh.kumar@email.com', city: 'Mumbai', source: 'Website', stage: 'Contacted', score: 78, type: '3BHK', pi: 0, ai: 2, budget: '₹85L', lc: 3 },
            { name: 'Tanvi Joshi', phone: '+91 98700 56789', email: 'tanvi.joshi@corp.in', city: 'Pune', source: 'Referral', stage: 'Contacted', score: 73, type: '2BHK', pi: 2, ai: 4, budget: '₹55L', lc: 4 },
            { name: 'Kunal Mehta', phone: '+91 70001 56789', email: 'kunal.mehta@email.com', city: 'Surat', source: 'Website', stage: 'Contacted', score: 68, type: '3BHK', pi: 2, ai: 5, budget: '₹65L', lc: 6 },
            { name: 'Geeta Pillai', phone: '+91 80012 34567', email: 'geeta.pillai@email.com', city: 'Chennai', source: 'Google Ads', stage: 'Contacted', score: 61, type: '2BHK', pi: 4, ai: 3, budget: '₹50L', lc: 7 },
            { name: 'Nandini Choudhary', phone: '+91 95600 12345', email: 'nandini.c@startup.com', city: 'Jaipur', source: 'Social Media', stage: 'Contacted', score: 58, type: '1BHK', pi: 4, ai: 4, budget: '₹35L', lc: 8 },
            // New
            { name: 'Sunita Joshi', phone: '+91 73456 78901', email: 'sunita.joshi@yahoo.com', city: 'Pune', source: 'Referral', stage: 'New', score: 55, type: '1BHK', pi: 4, ai: 2, budget: '₹45L', lc: 1 },
            { name: 'Vikash Pandey', phone: '+91 84500 12345', email: 'vikash.p@email.com', city: 'Lucknow', source: 'Website', stage: 'New', score: 50, type: '2BHK', pi: 4, ai: 5, budget: '₹48L', lc: 0 },
            { name: 'Priya Rajan', phone: '+91 89000 34567', email: 'priya.rajan@email.com', city: 'Kochi', source: 'Google Ads', stage: 'New', score: 60, type: '2BHK', pi: 4, ai: 3, budget: '₹52L', lc: 0 },
            { name: 'Anand Krishamurthy', phone: '+91 99123 45678', email: 'anand.k@enterprise.in', city: 'Coimbatore', source: 'PropTech Portal', stage: 'New', score: 65, type: '3BHK', pi: 1, ai: 4, budget: '₹90L', lc: 2 },
            { name: 'Simran Sethi', phone: '+91 80900 23456', email: 'simran.sethi@email.com', city: 'Chandigarh', source: 'Social Media', stage: 'New', score: 45, type: '2BHK', pi: 2, ai: 5, budget: '₹58L', lc: 0 },
            { name: 'Manoj Tiwari', phone: '+91 76900 34567', email: 'manoj.tiwari@email.com', city: 'Bhopal', source: 'Walk-in', stage: 'New', score: 52, type: '2BHK', pi: 2, ai: 2, budget: '₹62L', lc: 1 },
            { name: 'Seema Kapoor', phone: '+91 91900 23456', email: 'seema.kapoor@email.com', city: 'Nagpur', source: 'Website', stage: 'New', score: 48, type: '3BHK', pi: 0, ai: 3, budget: '₹78L', lc: 0 },
            { name: 'Harish Nambiar', phone: '+91 84300 56789', email: 'harish.n@tech.com', city: 'Bangalore', source: 'Referral', stage: 'New', score: 72, type: '3BHK', pi: 1, ai: 4, budget: '₹95L', lc: 3 },
            { name: 'Shweta Agarwal', phone: '+91 77600 12345', email: 'shweta.a@email.com', city: 'Indore', source: 'Social Media', stage: 'New', score: 40, type: '1BHK', pi: 4, ai: 5, budget: '₹38L', lc: 0 },
            { name: 'Ravi Shankar', phone: '+91 99500 45678', email: 'ravi.shankar@govt.in', city: 'Hyderabad', source: 'Walk-in', stage: 'New', score: 63, type: '3BHK', pi: 3, ai: 2, budget: '₹85L', lc: 2 },
            { name: 'Pallavi Deshpande', phone: '+91 88200 56789', email: 'pallavi.d@corp.com', city: 'Nashik', source: 'Google Ads', stage: 'New', score: 55, type: '2BHK', pi: 2, ai: 3, budget: '₹60L', lc: 1 },
            // Lost
            { name: 'Amit Trivedi', phone: '+91 64567 89012', email: 'amit.trivedi@gmail.com', city: 'Surat', source: 'Website', stage: 'Lost', score: 30, type: '2BHK', pi: 4, ai: 3, budget: '₹55L', lc: 15 },
            { name: 'Rekha Pillai', phone: '+91 73300 11234', email: 'rekha.pillai@email.com', city: 'Chennai', source: 'Google Ads', stage: 'Lost', score: 25, type: '1BHK', pi: 4, ai: 4, budget: '₹40L', lc: 20 },
            { name: 'Ganesh Rao', phone: '+91 91100 33456', email: 'ganesh.rao@email.com', city: 'Pune', source: 'Social Media', stage: 'Lost', score: 28, type: '2BHK', pi: 2, ai: 5, budget: '₹65L', lc: 12 },
        ];

        const leadRows = [];
        for (const l of LEADS) {
            const lastContact = l.lc > 0 ? daysAgo(l.lc) : null;
            const priority = l.score >= 80 ? 'High' : l.score >= 60 ? 'Medium' : 'Low';
            const { rows: [row] } = await client.query(`
                INSERT INTO leads (tenant_id, assigned_to, name, phone, email, city, source, stage, score, priority, property_type, project_id, budget, last_contact_at, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
            `, [tid, agents[l.ai % agents.length].id, l.name, l.phone, l.email, l.city, l.source, l.stage, l.score, priority, l.type, projRows[l.pi].id, l.budget, lastContact, daysAgo(randInt(5, 60))]);
            leadRows.push(row);
        }
        console.log(`✓ Leads: ${leadRows.length} created`);

        // ── Customers (from Won leads) ────────────────────────────────
        const wonLeads = leadRows.filter(l => l.stage === 'Won');
        const customerRows = [];
        const custData = [
            { pan: 'ABCPK1234L', aadhar: '1234-5678-9012', addr: 'Flat 4B, Hill View Apartments, Banjara Hills' },
            { pan: 'DEFMK5678M', aadhar: '2345-6789-0123', addr: '23, Koramangala 5th Block, Bangalore' },
            { pan: 'GHINK9012N', aadhar: '3456-7890-1234', addr: 'Sea Breeze CHS, Versova, Andheri West' },
        ];

        for (let i = 0; i < wonLeads.length; i++) {
            const lead = wonLeads[i];
            const cd = custData[i % custData.length];
            const { rows: [cust] } = await client.query(`
                INSERT INTO customers (tenant_id, lead_id, name, email, phone, city, address, pan_number, aadhar_number)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
            `, [tid, lead.id, lead.name, lead.email, lead.phone, lead.city, cd.addr, cd.pan, cd.aadhar]);
            customerRows.push(cust);
        }
        console.log(`✓ Customers: ${customerRows.length} created`);

        // ── Bookings (5 varied bookings) ─────────────────────────────
        const BOOKINGS = [
            { ci: 0, pi: 3, unit: 'V-A0102', amount: 17500000, plan: 'Construction Linked', status: 'Confirmed', token: 875000, agent: agents[0] },
            { ci: 1, pi: 1, unit: 'B-0301', amount: 12500000, plan: 'Down Payment', status: 'Pending Docs', token: 625000, agent: agents[1] },
            { ci: 2, pi: 0, unit: 'A-0604', amount: 9800000, plan: 'EMI', status: 'Confirmed', token: 490000, agent: agents[0] },
        ];

        const bookingRows = [];
        for (const b of BOOKINGS) {
            if (b.ci >= customerRows.length) continue;
            const { rows: [bk] } = await client.query(`
                INSERT INTO bookings (tenant_id, customer_id, project_id, unit_no, assigned_agent_id, total_amount, payment_plan, status, token_amount, token_collected, token_date, token_mode, token_reference, booking_date)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,'NEFT/RTGS',$11,$12) RETURNING *
            `, [tid, customerRows[b.ci].id, projRows[b.pi].id, b.unit, b.agent.id,
                b.amount, b.plan, b.status, b.token,
                daysAgo(randInt(5, 30)).toISOString().split('T')[0],
                `TXN${Date.now().toString().slice(-8)}`,
                daysAgo(randInt(5, 30)).toISOString().split('T')[0]]);
            bookingRows.push(bk);
        }
        console.log(`✓ Bookings: ${bookingRows.length} created`);

        // ── Payment Plans + Installments ─────────────────────────────
        const INSTALLMENT_TEMPLATES = {
            'Construction Linked': [
                { milestone: 'Token Amount', pct: 5 },
                { milestone: 'Booking Amount', pct: 10 },
                { milestone: 'On Foundation', pct: 15 },
                { milestone: 'Plinth Level', pct: 10 },
                { milestone: 'Ground Floor Slab', pct: 10 },
                { milestone: '2nd Floor Slab', pct: 10 },
                { milestone: 'Top Floor Slab', pct: 10 },
                { milestone: 'Brickwork Complete', pct: 10 },
                { milestone: 'Plastering Complete', pct: 10 },
                { milestone: 'Possession', pct: 10 },
            ],
            'Down Payment': [
                { milestone: 'Token', pct: 5 },
                { milestone: 'Down Payment (30%)', pct: 30 },
                { milestone: 'On Registration', pct: 65 },
            ],
            'EMI': [
                { milestone: 'Token Amount', pct: 5 },
                { milestone: 'EMI 1 (Month 1)', pct: 5 },
                { milestone: 'EMI 2 (Month 2)', pct: 5 },
                { milestone: 'EMI 3 (Month 3)', pct: 5 },
                { milestone: 'EMI 4 (Month 4)', pct: 5 },
                { milestone: 'EMI 5 (Month 5)', pct: 5 },
                { milestone: 'EMI 6 (Month 6)', pct: 5 },
                { milestone: 'EMI 7 (Month 7)', pct: 5 },
                { milestone: 'EMI 8 (Month 8)', pct: 5 },
                { milestone: 'Balance on Possession', pct: 55 },
            ],
        };

        let totalInstallments = 0;
        for (let bi = 0; bi < bookingRows.length; bi++) {
            const bk = bookingRows[bi];
            const template = INSTALLMENT_TEMPLATES[bk.payment_plan] || INSTALLMENT_TEMPLATES['Construction Linked'];

            const { rows: [plan] } = await client.query(`
                INSERT INTO payment_plans (tenant_id, booking_id, plan_name, total_amount)
                VALUES ($1,$2,$3,$4) RETURNING *
            `, [tid, bk.id, bk.payment_plan, bk.total_amount]);

            for (let j = 0; j < template.length; j++) {
                const tmpl = template[j];
                const amount = (bk.total_amount * tmpl.pct) / 100;
                let daysOffset = -30 + (j * 45);
                const dueDate = daysOffset < 0 ? daysAgo(Math.abs(daysOffset)) : daysFromNow(daysOffset);
                const isPaid = daysOffset < -5;
                const isOverdue = daysOffset < 0 && !isPaid && Math.random() > 0.7;
                let status = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Upcoming';
                const paidDate = isPaid ? daysAgo(Math.abs(daysOffset) - 2).toISOString().split('T')[0] : null;
                const receiptNo = isPaid ? `RCP-2026-${(bi * 10 + j + 1).toString().padStart(3, '0')}` : null;

                await client.query(`
                    INSERT INTO installments (tenant_id, payment_plan_id, booking_id, milestone, amount, percentage, due_date, paid_date, status, receipt_no, payment_mode)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                `, [tid, plan.id, bk.id, tmpl.milestone, amount, tmpl.pct,
                    dueDate.toISOString().split('T')[0], paidDate, status, receiptNo,
                    isPaid ? rand(['NEFT', 'RTGS', 'UPI', 'Cheque']) : null]);
                totalInstallments++;
            }
        }
        console.log(`✓ Installments: ${totalInstallments} created`);

        // ── Follow-ups (25 varied) ────────────────────────────────────
        const FU_TYPES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'];
        const FU_NOTES = [
            'Interested in 3BHK, follow up after site visit',
            'Send updated payment plan PDF',
            'Discuss loan options and pre-approval',
            'Customer requested floor plan drawings',
            'Schedule demo flat walk-through',
            'Negotiate final price — room for 2% reduction',
            'Await NOC from bank, follow up on status',
            'Send RERA certificate and project details',
            'Confirm final token payment date',
            'Share video tour link of sample flat',
        ];

        const activeLeads = leadRows.filter(l => !['Won', 'Lost'].includes(l.stage));
        let fuCount = 0;
        for (const lead of activeLeads.slice(0, 20)) {
            const numFu = randInt(1, 3);
            for (let f = 0; f < numFu; f++) {
                const doffset = randInt(-5, 15);
                const sched = doffset < 0 ? daysAgo(-doffset) : daysFromNow(doffset);
                const status = doffset < -1 ? rand(['Completed', 'Completed', 'Cancelled']) : 'Pending';
                await client.query(`
                    INSERT INTO followups (tenant_id, lead_id, assigned_to, type, priority, scheduled_at, status, note)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                `, [tid, lead.id, lead.assigned_to, rand(FU_TYPES),
                    lead.score >= 80 ? 'High' : lead.score >= 60 ? 'Medium' : 'Low',
                    sched, status, rand(FU_NOTES)]);
                fuCount++;
            }
        }
        console.log(`✓ Follow-ups: ${fuCount} created`);

        // ── Site Visits (12) ─────────────────────────────────────────
        const siteVisitLeads = leadRows.filter(l => ['Site Visit', 'Negotiation'].includes(l.stage));
        const transport = ['Agent Car', 'Own Vehicle', 'Company Cab', 'Shared Cab'];
        let svCount = 0;
        for (const lead of siteVisitLeads) {
            const doffset = randInt(-7, 14);
            const sched = doffset < 0 ? daysAgo(-doffset) : daysFromNow(doffset);
            sched.setHours(10 + svCount % 4);
            const status = doffset < -1 ? rand(['Completed', 'Cancelled', 'No Show', 'Completed', 'Completed']) : 'Scheduled';
            await client.query(`
                INSERT INTO site_visits (tenant_id, lead_id, project_id, assigned_agent, scheduled_at, transport, status, notes)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `, [tid, lead.id, lead.project_id, lead.assigned_to, sched, rand(transport), status,
                status === 'Completed' ? 'Lead showed interest, sent follow-up mail' : null]);
            svCount++;
        }
        console.log(`✓ Site visits: ${svCount} created`);

        // ── Channel Partners (6) ─────────────────────────────────────
        const PARTNERS = [
            { name: 'Deepak Realtors', co: 'Deepak Real Estate Pvt Ltd', email: 'deepak@deepakrealty.com', phone: '+91 98001 23456', city: 'Mumbai', rera: 'MH-RERA-A51800001234', rate: 2.5, leads: 28, bk: 7, comm: 1237500 },
            { name: 'Sunanda Properties', co: 'Sunanda Prop Pvt Ltd', email: 'info@sunandaprop.com', phone: '+91 97002 34567', city: 'Pune', rera: 'MH-RERA-A51900005678', rate: 2.0, leads: 19, bk: 4, comm: 490000 },
            { name: 'Kumar Associates', co: 'Kumar Associates', email: 'rk@kumarassoc.in', phone: '+91 96003 45678', city: 'Bangalore', rera: 'KA-RERA-PRJ-20230001', rate: 2.0, leads: 14, bk: 2, comm: 215000 },
            { name: 'Ananya Real Estate', co: 'Ananya RE Solutions LLP', email: 'ananya.re@email.com', phone: '+91 95004 56789', city: 'Hyderabad', rera: 'TS-RERA-2022-0008765', rate: 2.25, leads: 11, bk: 3, comm: 387000 },
            { name: 'Patel Brokers', co: 'Patel Brokers & Co.', email: 'patelbrokers@email.com', phone: '+91 94005 67890', city: 'Ahmedabad', rera: 'GJ-RERA-REA-23-00678', rate: 1.75, leads: 8, bk: 1, comm: 96250 },
            { name: 'Metro Property Advisors', co: 'Metro Prop Advisors Pvt Ltd', email: 'metro.prop@advisors.in', phone: '+91 93006 78901', city: 'Delhi', rera: 'RERA-DL-2023-567890', rate: 2.0, leads: 5, bk: 0, comm: 0 },
        ];

        for (const p of PARTNERS) {
            await client.query(`
                INSERT INTO channel_partners (tenant_id, name, company, email, phone, city, rera_number, commission_rate, total_leads_referred, total_bookings, total_commission, status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Active')
            `, [tid, p.name, p.co, p.email, p.phone, p.city, p.rera, p.rate, p.leads, p.bk, p.comm]);
        }
        console.log(`✓ Channel partners: ${PARTNERS.length} created`);

        // ── Enquiries (10 recent public form enquiries) ───────────────
        const ENQ_NAMES = ['Pooja Sharma', 'Rajan Menon', 'Ankita Singh', 'Bharat Patel', 'Lata Krishnan', 'Sunil Verma', 'Mala Iyer', 'Deepak Jha', 'Prerna Nair', 'Vijay Chavan'];
        const ENQ_CITIES = ['Mumbai', 'Pune', 'Bangalore', 'Hyderabad', 'Chennai', 'Delhi', 'Surat', 'Jaipur', 'Ahmedabad', 'Nagpur'];
        const ENQ_SOURCES = ['Website Enquiry', 'Google Search', 'Facebook/Instagram', 'Friend Referral', 'PropTech Portal'];
        const BUDGETS = ['Under ₹30L', '₹30L–₹60L', '₹60L–₹1Cr', '₹1Cr–₹2Cr'];
        for (let i = 0; i < 10; i++) {
            await client.query(`
                INSERT INTO enquiries (tenant_id, name, phone, email, city, property_type, budget, source, status, ref_no, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            `, [tid, ENQ_NAMES[i], `+91 ${randInt(70000, 99999)} ${randInt(10000, 99999)}`,
                `${ENQ_NAMES[i].toLowerCase().replace(' ', '.')}@email.com`,
                ENQ_CITIES[i], rand(['2BHK', '3BHK', '1BHK']), rand(BUDGETS), rand(ENQ_SOURCES),
                rand(['New', 'New', 'New', 'Contacted']), `ENQ-${(1001 + i)}`,
                daysAgo(randInt(0, 7))]);
        }
        console.log(`✓ Enquiries: 10 created`);

        // ── Notifications (Strategic Command Data) ───────────────────
        let msgCount = 0;
        for (let i = 0; i < 20; i++) {
            const lead = leadRows[i % leadRows.length];
            const agent = agents[i % agents.length];
            const isSentByAgent = i % 2 === 0;
            const diff = randInt(1, 10);
            
            await client.query(`
                INSERT INTO notifications (tenant_id, lead_id, sent_by, channel, recipient, body, status, sent_at)
                VALUES ($1, $2, $3, 'WhatsApp', $4, $5, 'Delivered', $6)
            `, [tid, lead.id, isSentByAgent ? agent.id : null, lead.phone, 
                isSentByAgent 
                    ? `Hello ${lead.name.split(' ')[0]}, just checking if you've seen the ${lead.property_type} floor plans I sent earlier.`
                    : `Hi, yes I saw them. Can we schedule a site visit for this weekend?`,
                daysAgo(diff)]);
            msgCount++;
        }
        console.log(`✓ Notifications: ${msgCount} social messages created`);

        // ── Subscription ─────────────────────────────────────────────
        await client.query(`
            INSERT INTO subscriptions (tenant_id, plan, status, amount, currency, billing_cycle, expires_at)
            VALUES ($1,'pro','active',4999,'INR','monthly',$2)
        `, [tid, daysFromNow(365)]);
        console.log(`✓ Subscription: pro plan`);

        // ── Automations ──────────────────────────────────────────────
        const WORKFLOWS = [
            { name: 'Round Robin Assignment', trigger: 'lead_create', t_cfg: {}, action: 'assign_agent', a_cfg: { method: 'round_robin' } },
            { name: 'High Value Alert', trigger: 'lead_score', t_cfg: { min: 80 }, action: 'notify_manager', a_cfg: { channel: 'email' } },
            { name: 'Immediate Follow-up Reminder', trigger: 'lead_create', t_cfg: {}, action: 'set_reminder', a_cfg: { delay: 30, unit: 'minutes' } },
            { name: 'Stale Lead Re-assignment', trigger: 'lead_idle', t_cfg: { hours: 24 }, action: 'assign_agent', a_cfg: { method: 'round_robin', group: 'backup' } }
        ];

        for (const w of WORKFLOWS) {
            const { rows: [row] } = await client.query(`
                INSERT INTO workflows (tenant_id, name, trigger_type, trigger_config, action_type, action_config, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id
            `, [tid, w.name, w.trigger, w.t_cfg, w.action, w.a_cfg]);

            // Add some logs
            await client.query(`
                INSERT INTO automation_logs (tenant_id, workflow_id, lead_id, status, details)
                VALUES ($1, $2, $3, 'success', $4)
            `, [tid, row.id, leadRows[randInt(0, 10)].id, JSON.stringify({ message: 'Lead assigned via ' + w.name })]);
        }
        console.log(`✓ Automations: ${WORKFLOWS.length} workflows created`);

        await client.query('COMMIT');

        console.log('\n═══════════════════════════════════════════════');
        console.log('🎉 Rich seed complete!');
        console.log('═══════════════════════════════════════════════');
        console.log(`   Leads:            ${leadRows.length}`);
        console.log(`   Projects:         ${projRows.length}`);
        console.log(`   Inventory Units:  ${3 * 8 * 4}`);
        console.log(`   Customers:        ${customerRows.length}`);
        console.log(`   Bookings:         ${bookingRows.length}`);
        console.log(`   Installments:     ${totalInstallments}`);
        console.log(`   Follow-ups:       ${fuCount}`);
        console.log(`   Site Visits:      ${svCount}`);
        console.log(`   Channel Partners: ${PARTNERS.length}`);
        console.log(`   Enquiries:        10`);
        console.log('');
        console.log('📋 Login credentials:');
        console.log('   Admin:   arjun@zentrix.com   / Admin@123');
        console.log('   Manager: priya@zentrix.com   / Manager@123');
        console.log('   Agent:   rohan@zentrix.com   / Agent@123');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', err.message);
        console.error(err.stack);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seedRich().catch(err => {
    console.error('SEED ERROR:', err);
    process.exit(1);
});

