import { writerPool } from '../src/db/pool';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const queries = [
    `CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);`,
    `CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id);`,
    `CREATE INDEX IF NOT EXISTS idx_interactions_tenant_id ON interactions(tenant_id);`,
    `CREATE INDEX IF NOT EXISTS idx_followups_tenant_scheduled ON followups(tenant_id, scheduled_at);`,
    `CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON followups(lead_id);`,
    `CREATE INDEX IF NOT EXISTS idx_site_visits_tenant_scheduled ON site_visits(tenant_id, scheduled_at);`
];

async function main() {
    console.log('🚀 Running database optimization index script...');
    console.log('Connecting to database...');
    
    let client;
    try {
        client = await writerPool.connect();
        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await client.query(query);
            console.log('✅ Done.');
        }
        console.log('🎉 All indexes created successfully!');
    } catch (err: any) {
        console.error('❌ Error creating indexes:', err.message);
    } finally {
        if (client) {
            client.release();
        }
        await writerPool.end();
        process.exit(0);
    }
}

main();
