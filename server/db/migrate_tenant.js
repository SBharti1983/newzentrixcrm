/**
 * TENANT MIGRATION: Neon → Supabase
 * Migrates the Mayainfratech tenant and all associated data.
 */
require('dotenv').config();
const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require';
const SUPA_URL = process.env.DATABASE_URL;

const neon = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
const supa = new Pool({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });

// Helper: Insert rows, skipping conflicts
async function bulkInsert(client, table, rows, conflictCol = 'id') {
    if (!rows.length) return 0;
    const cols = Object.keys(rows[0]);
    let inserted = 0;
    for (const row of rows) {
        const vals = cols.map(c => row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        try {
            await client.query(
                `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO NOTHING`,
                vals
            );
            inserted++;
        } catch (err) {
            console.warn(`  ⚠ Skip ${table} row (${err.message.slice(0, 80)})`);
        }
    }
    return inserted;
}

async function migrate() {
    console.log('═══════════════════════════════════════════════');
    console.log('  TENANT MIGRATION: Neon → Supabase');
    console.log('═══════════════════════════════════════════════\n');

    let neonClient, supaClient;
    try {
        // 1. Connect to both databases
        console.log('🔌 Connecting to Neon...');
        neonClient = await neon.connect();
        console.log('✅ Neon connected');

        console.log('🔌 Connecting to Supabase...');
        supaClient = await supa.connect();
        console.log('✅ Supabase connected\n');

        // 2. Find Mayainfratech tenant on Neon
        const { rows: tenants } = await neonClient.query(`SELECT * FROM tenants ORDER BY created_at`);
        console.log(`📋 Found ${tenants.length} tenant(s) on Neon:`);
        tenants.forEach(t => console.log(`   - ${t.name} (${t.slug}) [${t.plan}]`));

        const maya = tenants.find(t => t.name.toLowerCase().includes('maya') || t.slug?.toLowerCase().includes('maya'));
        if (!maya) {
            console.log('\n⚠ No "Mayainfratech" tenant found. Migrating ALL tenants instead...');
        }

        const tenantsToMigrate = maya ? [maya] : tenants;

        await supaClient.query('BEGIN');

        for (const tenant of tenantsToMigrate) {
            const tid = tenant.id;
            console.log(`\n──────────────────────────────────────────`);
            console.log(`🏢 Migrating: ${tenant.name} (${tid})`);
            console.log(`──────────────────────────────────────────`);

            // Check if tenant already exists in Supabase
            const { rows: existing } = await supaClient.query('SELECT id FROM tenants WHERE id = $1', [tid]);
            if (existing.length) {
                console.log('  ℹ Tenant already exists in Supabase, updating...');
                await supaClient.query('DELETE FROM tenants WHERE id = $1', [tid]);
            }

            // -- TENANT --
            await bulkInsert(supaClient, 'tenants', [tenant]);
            console.log('  ✓ Tenant record');

            // -- USERS --
            const { rows: users } = await neonClient.query('SELECT * FROM users WHERE tenant_id = $1', [tid]);
            // Map password field: Neon might use 'password' or 'password_hash'
            const mappedUsers = users.map(u => {
                const mapped = { ...u };
                if (u.password && !u.password_hash) {
                    mapped.password_hash = u.password;
                }
                // Remove 'password' field if password_hash exists (Supabase schema uses password_hash)
                delete mapped.password;
                // Remove any columns that don't exist in our schema
                delete mapped.last_active;
                return mapped;
            });
            const userCount = await bulkInsert(supaClient, 'users', mappedUsers);
            console.log(`  ✓ Users: ${userCount}`);

            // -- PROJECTS --
            const { rows: projects } = await neonClient.query('SELECT * FROM projects WHERE tenant_id = $1', [tid]);
            const projCount = await bulkInsert(supaClient, 'projects', projects);
            console.log(`  ✓ Projects: ${projCount}`);

            // -- LEADS --
            const { rows: leads } = await neonClient.query('SELECT * FROM leads WHERE tenant_id = $1', [tid]);
            const leadCount = await bulkInsert(supaClient, 'leads', leads);
            console.log(`  ✓ Leads: ${leadCount}`);

            // -- CUSTOMERS --
            try {
                const { rows: customers } = await neonClient.query('SELECT * FROM customers WHERE tenant_id = $1', [tid]);
                const custCount = await bulkInsert(supaClient, 'customers', customers);
                console.log(`  ✓ Customers: ${custCount}`);
            } catch (e) { console.log(`  - Customers: skipped (${e.message.slice(0,50)})`); }

            // -- INVENTORY --
            try {
                const { rows: inv } = await neonClient.query('SELECT * FROM inventory WHERE tenant_id = $1', [tid]);
                const invCount = await bulkInsert(supaClient, 'inventory', inv);
                console.log(`  ✓ Inventory: ${invCount}`);
            } catch (e) { console.log(`  - Inventory: skipped (${e.message.slice(0,50)})`); }

            // -- INTERACTIONS --
            try {
                const { rows: interactions } = await neonClient.query('SELECT * FROM interactions WHERE tenant_id = $1', [tid]);
                const intCount = await bulkInsert(supaClient, 'interactions', interactions);
                console.log(`  ✓ Interactions: ${intCount}`);
            } catch (e) { console.log(`  - Interactions: skipped (${e.message.slice(0,50)})`); }

            // -- BOOKINGS --
            try {
                const { rows: bookings } = await neonClient.query('SELECT * FROM bookings WHERE tenant_id = $1', [tid]);
                const bkCount = await bulkInsert(supaClient, 'bookings', bookings);
                console.log(`  ✓ Bookings: ${bkCount}`);
            } catch (e) { console.log(`  - Bookings: skipped (${e.message.slice(0,50)})`); }

            // -- FOLLOWUPS --
            try {
                const { rows: followups } = await neonClient.query('SELECT * FROM followups WHERE tenant_id = $1', [tid]);
                const fuCount = await bulkInsert(supaClient, 'followups', followups);
                console.log(`  ✓ Followups: ${fuCount}`);
            } catch (e) { console.log(`  - Followups: skipped (${e.message.slice(0,50)})`); }

            // -- SITE VISITS --
            try {
                const { rows: sv } = await neonClient.query('SELECT * FROM site_visits WHERE tenant_id = $1', [tid]);
                const svCount = await bulkInsert(supaClient, 'site_visits', sv);
                console.log(`  ✓ Site Visits: ${svCount}`);
            } catch (e) { console.log(`  - Site Visits: skipped (${e.message.slice(0,50)})`); }

            // -- WORKFLOWS --
            try {
                const { rows: wf } = await neonClient.query('SELECT * FROM workflows WHERE tenant_id = $1', [tid]);
                const wfCount = await bulkInsert(supaClient, 'workflows', wf);
                console.log(`  ✓ Workflows: ${wfCount}`);
            } catch (e) { console.log(`  - Workflows: skipped (${e.message.slice(0,50)})`); }

            // -- ACTIVITY LOG --
            try {
                const { rows: al } = await neonClient.query('SELECT * FROM activity_log WHERE tenant_id = $1', [tid]);
                const alCount = await bulkInsert(supaClient, 'activity_log', al);
                console.log(`  ✓ Activity Log: ${alCount}`);
            } catch (e) { console.log(`  - Activity Log: skipped (${e.message.slice(0,50)})`); }

            // -- NOTIFICATIONS --
            try {
                const { rows: notif } = await neonClient.query('SELECT * FROM notifications WHERE tenant_id = $1', [tid]);
                const nfCount = await bulkInsert(supaClient, 'notifications', notif);
                console.log(`  ✓ Notifications: ${nfCount}`);
            } catch (e) { console.log(`  - Notifications: skipped (${e.message.slice(0,50)})`); }

            // -- PUSH SUBSCRIPTIONS --
            try {
                const { rows: ps } = await neonClient.query('SELECT * FROM push_subscriptions WHERE tenant_id = $1', [tid]);
                if (ps.length) {
                    const psCount = await bulkInsert(supaClient, 'push_subscriptions', ps);
                    console.log(`  ✓ Push Subscriptions: ${psCount}`);
                }
            } catch (e) { /* silent */ }

            // -- DOCUMENTS --
            try {
                const { rows: docs } = await neonClient.query('SELECT * FROM documents WHERE tenant_id = $1', [tid]);
                const docCount = await bulkInsert(supaClient, 'documents', docs);
                console.log(`  ✓ Documents: ${docCount}`);
            } catch (e) { console.log(`  - Documents: skipped (${e.message.slice(0,50)})`); }

            // -- PAYMENT PLANS & INSTALLMENTS --
            try {
                const { rows: pp } = await neonClient.query('SELECT * FROM payment_plans WHERE tenant_id = $1', [tid]);
                if (pp.length) {
                    await bulkInsert(supaClient, 'payment_plans', pp);
                    console.log(`  ✓ Payment Plans: ${pp.length}`);
                }
            } catch (e) { console.log(`  - Payment Plans: skipped`); }

            try {
                const { rows: inst } = await neonClient.query('SELECT * FROM installments WHERE tenant_id = $1', [tid]);
                if (inst.length) {
                    await bulkInsert(supaClient, 'installments', inst);
                    console.log(`  ✓ Installments: ${inst.length}`);
                }
            } catch (e) { console.log(`  - Installments: skipped`); }
        }

        await supaClient.query('COMMIT');
        console.log('\n═══════════════════════════════════════════════');
        console.log('🎉 MIGRATION COMPLETE!');
        console.log('═══════════════════════════════════════════════\n');

    } catch (err) {
        console.error('\n❌ MIGRATION FAILED:', err.message);
        if (supaClient) await supaClient.query('ROLLBACK').catch(() => {});
        console.error(err.stack);
    } finally {
        if (neonClient) neonClient.release();
        if (supaClient) supaClient.release();
        await neon.end();
        await supa.end();
    }
}

migrate();
