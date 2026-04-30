/**
 * ZentrixCRM — Production Client Onboarding Script
 * Use this to create new real-world tenants (SaaS clients).
 * 
 * Usage: node db/seed-production.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const poolConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

// EDIT THIS OBJECT TO ADD NEW CLIENTS
const NEW_CLIENT = {
    tenant: {
        name: 'Maya Infratech',
        slug: 'mayainfratech', // This will be mayainfratech.zentrixcrm.com
        plan: 'pro',
    },
    admin: {
        name: 'Maya Admin',
        email: 'admin@mayainfratech.in', // LOGIN EMAIL
        password: 'Maya@123',             // LOGIN PASSWORD
        role: 'admin',
    }
};

async function onboard() {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        console.log(`🚀 Onboarding new tenant: ${NEW_CLIENT.tenant.name}...`);

        // 1. Create Tenant
        const { rows: [tenant] } = await client.query(`
            INSERT INTO tenants (name, slug, plan)
            VALUES ($1, $2, $3)
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        `, [NEW_CLIENT.tenant.name, NEW_CLIENT.tenant.slug, NEW_CLIENT.tenant.plan]);

        const tid = tenant.id;

        // 2. Create Admin User
        const hash = await bcrypt.hash(NEW_CLIENT.admin.password, 10);
        const initials = NEW_CLIENT.admin.name.split(' ').map(n => n[0]).join('').toUpperCase();

        const { rows: [user] } = await client.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role, avatar)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tenant_id, email) DO UPDATE 
            SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
            RETURNING id
        `, [tid, NEW_CLIENT.admin.name, NEW_CLIENT.admin.email, hash, NEW_CLIENT.admin.role, initials]);

        await client.query('COMMIT');
        
        console.log('\n✅ ONBOARDING SUCCESSFUL!');
        console.log('---------------------------');
        console.log(`Domain:   https://${NEW_CLIENT.tenant.slug}.zentrixcrm.com`);
        console.log(`Email:    ${NEW_CLIENT.admin.email}`);
        console.log(`Password: ${NEW_CLIENT.admin.password}`);
        console.log('---------------------------\n');

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Onboarding failed:', err.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

onboard();
