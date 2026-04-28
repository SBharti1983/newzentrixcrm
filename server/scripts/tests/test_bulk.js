const pool = require('./db/pool');

async function testBulkUpdate() {
    try {
        const { rows: users } = await pool.query("SELECT * FROM users WHERE role = 'agent' LIMIT 1");
        const { rows: leads } = await pool.query("SELECT * FROM leads LIMIT 1");
        
        if (users.length && leads.length) {
            console.log("Testing bulk update with lead:", leads[0].id, "and agent:", users[0].id);
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const setClauses = "assigned_to = $3";
                const leadIds = [leads[0].id];
                const tenantId = leads[0].tenant_id;
                
                const { rows } = await client.query(
                    `UPDATE leads SET ${setClauses} WHERE id = ANY($1) AND tenant_id = $2 RETURNING id`,
                    [leadIds, tenantId, users[0].id]
                );
                
                console.log("Update success. Rows:", rows.length);
                
                await client.query(
                    `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, new_data)
                     VALUES ($1,$2,'lead',NULL,'bulk_updated',$3)`,
                    [tenantId, users[0].id, JSON.stringify({ count: rows.length })]
                );
                
                console.log("Activity log success.");
                await client.query('ROLLBACK'); // Rollback for test
            } catch (err) {
                console.error("DB Query Error:", err);
            } finally {
                client.release();
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

testBulkUpdate();
