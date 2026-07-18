import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../apps/api/.env') });

async function check() {
    const { pool } = await import('@zentrix/database');
    const leadId = '59f2b7b0-9afa-5cf3-e9d3-adfe349b7adc';
    const tenantId = '1bbc00c0-766f-498d-9814-b9fdeb56b24d';

    console.log(`Checking lead ${leadId} for tenant ${tenantId}...`);

    const { rows: leadRows } = await pool.query(
        'SELECT * FROM leads WHERE id = $1',
        [leadId]
    );
    console.log('Lead rows by ID:', leadRows);

    const { rows: allLeads } = await pool.query(
        'SELECT id, tenant_id, name, project_id FROM leads LIMIT 5'
    );
    console.log('Sample leads in database:', allLeads);

    await pool.end();
}

check().catch(console.error);
