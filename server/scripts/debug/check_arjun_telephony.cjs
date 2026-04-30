const { Client } = require('pg');
const client = new Client('postgresql://neondb_owner:npg_txarT3GIwA7m@ep-morning-bar-a8vrq9bt-pooler.eastus2.azure.neon.tech/zentrixcrm?sslmode=require&channel_binding=require');

client.connect().then(async () => {
    try {
        const res = await client.query("SELECT id, email, telephony_agent_id FROM users WHERE email = 'arjun@zentrix.com'");
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        client.end();
    }
});
