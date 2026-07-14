
const pool = require('./db/pool');

async function createLead() {
    try {
        console.log('Connecting to database...');
        const tResult = await pool.query('SELECT id FROM tenants LIMIT 1');
        if (tResult.rows.length === 0) throw new Error('No tenants found');
        const tenantId = tResult.rows[0].id;
        
        const uResult = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (uResult.rows.length === 0) throw new Error('No users found for tenant');
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
    } catch (err) {
        console.error('Error creating lead:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createLead();
