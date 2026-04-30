const { Client } = require('pg');
const connectionString = 'postgresql://postgres.uvnkbewvpewocaqzysqb:Agent%40123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function diagnose() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('--- Interactions Table ---');
        const resInt = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'interactions'");
        console.log('Columns:', resInt.rows.map(r => r.column_name).join(', '));

        console.log('\n--- Customers Table ---');
        const resCust = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customers'");
        console.log('Columns:', resCust.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('Diagnosis Error:', err);
    } finally {
        await client.end();
    }
}

diagnose();
