/**
 * ZentrixCRM — Production Seed Script
 * Creates 1 admin user + 1 tenant + 10 demo leads for testing
 * 
 * Usage: node db/seed-production.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const poolConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'zentrixcrm',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
    ...poolConfig,
    ssl: { rejectUnauthorized: false }
});

const DEMO_LEADS = [
    { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@gmail.com', city: 'Mumbai', source: 'Website', stage: 'New', priority: 'High', budget: '₹1.5 Cr', property_type: '3BHK', score: 72 },
    { name: 'Priya Mehta', phone: '9823456789', email: 'priya.mehta@outlook.com', city: 'Pune', source: 'Referral', stage: 'Contacted', priority: 'High', budget: '₹85 Lakh', property_type: '2BHK', score: 85 },
    { name: 'Vikram Singh', phone: '9912345678', email: 'vikram.singh@hotmail.com', city: 'Gurugram', source: 'Facebook', stage: 'Site Visit', priority: 'Medium', budget: '₹2.2 Cr', property_type: 'Villa', score: 90 },
    { name: 'Ananya Reddy', phone: '9845612378', email: 'ananya.reddy@gmail.com', city: 'Hyderabad', source: 'Google Ads', stage: 'Negotiation', priority: 'High', budget: '₹1.1 Cr', property_type: '3BHK', score: 88 },
    { name: 'Karan Patel', phone: '9765432100', email: 'karan.patel@yahoo.com', city: 'Ahmedabad', source: 'Walk-in', stage: 'New', priority: 'Medium', budget: '₹65 Lakh', property_type: '2BHK', score: 55 },
    { name: 'Sneha Iyer', phone: '9678901234', email: 'sneha.iyer@gmail.com', city: 'Bangalore', source: 'Instagram', stage: 'Contacted', priority: 'Low', budget: '₹45 Lakh', property_type: '1BHK', score: 40 },
    { name: 'Amit Deshmukh', phone: '9534567890', email: 'amit.deshmukh@gmail.com', city: 'Pune', source: 'Channel Partner', stage: 'Site Visit', priority: 'High', budget: '₹3.5 Cr', property_type: 'Penthouse', score: 92 },
    { name: 'Neha Kapoor', phone: '9456789012', email: 'neha.kapoor@outlook.com', city: 'Noida', source: 'Website', stage: 'New', priority: 'Medium', budget: '₹75 Lakh', property_type: '2BHK', score: 60 },
    { name: 'Rajesh Nair', phone: '9345678901', email: 'rajesh.nair@gmail.com', city: 'Chennai', source: 'Referral', stage: 'Contacted', priority: 'Medium', budget: '₹90 Lakh', property_type: '3BHK', score: 68 },
    { name: 'Deepika Joshi', phone: '9234567890', email: 'deepika.joshi@gmail.com', city: 'Jaipur', source: 'WhatsApp', stage: 'New', priority: 'Low', budget: '₹55 Lakh', property_type: '2BHK', score: 45 },
];

async function seed() {
    let client;
    try {
        client = await pool.connect();
        console.log('🌱 Starting production seed...\n');
        await client.query('BEGIN');

        // 1. Create tenant
        const { rows: [tenant] } = await client.query(
            `INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
             RETURNING *`,
            ['Zentrix Real Estate', 'zentrix', 'pro', 15, 10000, 50]
        );
        console.log(`✅ Tenant created: ${tenant.name} (${tenant.slug})`);
        console.log(`   Plan: ${tenant.plan} | Max Users: ${tenant.max_users} | Max Leads: ${tenant.max_leads}`);

        // 2. Create admin user
        const adminPassword = 'Admin@2026!';
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        const adminEmail = 'admin@zentrix.com';

        // Check if user already exists
        const { rows: existingUser } = await client.query(
            `SELECT id FROM users WHERE email = $1 AND tenant_id = $2`,
            [adminEmail, tenant.id]
        );

        let adminUser;
        if (existingUser.length > 0) {
            // Update existing user's password
            const { rows: [updated] } = await client.query(
                `UPDATE users SET password_hash = $1, is_active = TRUE, role = 'admin' WHERE id = $2 RETURNING *`,
                [passwordHash, existingUser[0].id]
            );
            adminUser = updated;
            console.log(`\n✅ Admin user updated (existing account)`);
        } else {
            const { rows: [created] } = await client.query(
                `INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, department)
                 VALUES ($1, $2, $3, $4, 'admin', 'AD', '+91-9999000001', 'Management')
                 RETURNING *`,
                [tenant.id, 'Admin', adminEmail, passwordHash]
            );
            adminUser = created;
            console.log(`\n✅ Admin user created`);
        }
        console.log(`   Email:    ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log(`   Role:     admin`);

        // 3. Create demo project
        const { rows: projectRows } = await client.query(
            `INSERT INTO projects (tenant_id, name, location, description, status, total_units, available_units, price_range, rera_number)
             VALUES ($1, 'Zentrix Towers', 'Bandra West, Mumbai', 'Premium residential towers with sea-facing views', 'Active', 120, 45, '₹85L - ₹3.5Cr', 'P52000001234')
             ON CONFLICT DO NOTHING
             RETURNING *`
            , [tenant.id]
        );
        const demoProject = projectRows[0];
        if (demoProject) {
            console.log(`\n✅ Demo project created: ${demoProject.name}`);
        }

        // 4. Create 10 demo leads
        let leadsCreated = 0;
        for (const lead of DEMO_LEADS) {
            try {
                await client.query(
                    `INSERT INTO leads (tenant_id, assigned_to, name, phone, email, city, source, stage, priority, budget, property_type, score, notes, last_contact_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() - INTERVAL '${Math.floor(Math.random() * 14) + 1} days')
                     ON CONFLICT DO NOTHING`,
                    [
                        tenant.id, adminUser.id, lead.name, lead.phone, lead.email,
                        lead.city, lead.source, lead.stage, lead.priority,
                        lead.budget, lead.property_type, lead.score,
                        `Interested in ${lead.property_type} property. Budget: ${lead.budget}. Source: ${lead.source}.`
                    ]
                );
                leadsCreated++;
            } catch (err) {
                // Skip if duplicate phone
                if (err.code !== '23505') console.warn(`  ⚠ Skipped ${lead.name}: ${err.message}`);
            }
        }
        console.log(`\n✅ ${leadsCreated} demo leads created`);

        await client.query('COMMIT');

        console.log('\n' + '═'.repeat(50));
        console.log('  🚀 PRODUCTION SEED COMPLETE');
        console.log('═'.repeat(50));
        console.log(`\n  Login Credentials:`);
        console.log(`  ─────────────────`);
        console.log(`  Email:    ${adminEmail}`);
        console.log(`  Password: ${adminPassword}`);
        console.log(`\n  ${leadsCreated} demo leads ready for testing.\n`);

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Seed failed:', err.message);
        throw err;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

seed().catch(err => {
    process.exit(1);
});
