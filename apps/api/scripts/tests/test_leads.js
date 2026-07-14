require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./db/pool');

async function test() {
    try {
        // Get a real tenant
        const tenants = await pool.query('SELECT id, name FROM tenants LIMIT 1');
        if (!tenants.rows.length) { console.log('No tenants found'); return; }
        const tenantId = tenants.rows[0].id;
        console.log('Tenant:', tenantId, tenants.rows[0].name);

        // Check lead count
        const cnt = await pool.query('SELECT COUNT(*) FROM leads WHERE tenant_id = $1', [tenantId]);
        console.log('Current lead count:', cnt.rows[0].count);

        // Check max_leads
        const tenant = await pool.query('SELECT max_leads FROM tenants WHERE id = $1', [tenantId]);
        console.log('Max leads:', tenant.rows[0].max_leads);

        // Try the exact insert the route does
        console.log('\n=== Testing exact INSERT query from route ===');
        const name = 'Test Lead Debug';
        const phone = '9876543999';
        const email = null;
        const city = null;
        const source = 'Website';
        const stage = 'New';
        const priority = 'Medium';
        const score = 50;
        const property_type = null;
        const project_id = null;
        const budget = null;
        const assigned_to = null;
        const notes = null;
        const channel_partner_id = null;

        // Check for duplicate
        const dup = await pool.query('SELECT id FROM leads WHERE tenant_id=$1 AND phone=$2', [tenantId, phone]);
        if (dup.rows.length) {
            console.log('Duplicate found, deleting first...');
            await pool.query('DELETE FROM leads WHERE id = $1', [dup.rows[0].id]);
        }

        const result = await pool.query(
            `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, priority, score, property_type, project_id, budget, assigned_to, notes, channel_partner_id, last_contact_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()) RETURNING *`,
            [tenantId, name, phone, email, city, source, stage, priority, score, property_type, project_id, budget, assigned_to, notes, channel_partner_id]
        );
        console.log('SUCCESS! New lead:', JSON.stringify(result.rows[0], null, 2));

        // Now test the activity_log insert (this is where the 500 might come from)
        console.log('\n=== Testing activity_log INSERT ===');
        const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // dummy
        try {
            // Get a real user
            const users = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
            const realUserId = users.rows.length ? users.rows[0].id : null;
            console.log('Real user ID:', realUserId);

            if (realUserId) {
                await pool.query(
                    `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, new_data)
                     VALUES ($1,$2,'lead',$3,'created',$4)`,
                    [tenantId, realUserId, result.rows[0].id, JSON.stringify(result.rows[0])]
                );
                console.log('Activity log insert SUCCESS!');
            }
        } catch (actErr) {
            console.error('ACTIVITY LOG ERROR:', actErr.message);
            console.error('Code:', actErr.code);
            console.error('Detail:', actErr.detail);
        }

        // Clean up
        await pool.query('DELETE FROM leads WHERE id = $1', [result.rows[0].id]);
        console.log('Cleanup done.');

    } catch (e) {
        console.error('ERROR:', e.message);
        console.error('Code:', e.code);
        console.error('Detail:', e.detail);
        console.error('Stack:', e.stack);
    } finally {
        await pool.end();
    }
}

test();
