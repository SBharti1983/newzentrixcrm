
const pool = require('../server/db/pool');

async function createLead() {
    try {
        const tResult = await pool.query('SELECT id FROM tenants LIMIT 1');
        const tenantId = tResult.rows[0].id;
        
        const uResult = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        const userId = uResult.rows[0].id;
        
        const leadNumber = '6202077242';
        const leadName = 'Test User (' + leadNumber + ')';
        
        const query = `
            INSERT INTO leads (tenant_id, assigned_to, name, phone, email, city, source, stage, score, property_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            tenantId, 
            userId, 
            leadName, 
            leadNumber, 
            'test_6202077242@example.com', 
            'Test City', 
            'Manual', 
            'New', 
            50, 
            'Apartment'
        ];
        
        const result = await pool.query(query, values);
        console.log('Lead created successfully:', result.rows[0].id);
        console.log('Details:', JSON.stringify(result.rows[0], null, 2));
    } catch (err) {
        console.error('Error creating lead:', err);
    } finally {
        await pool.end();
    }
}

createLead();
