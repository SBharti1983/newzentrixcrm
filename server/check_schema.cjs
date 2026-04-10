const { Client } = require('pg');
const connectionString = "postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require";

async function check() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'interactions'");
        console.log("COLUMNS IN 'interactions':");
        res.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
