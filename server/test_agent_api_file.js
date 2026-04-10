require('dotenv').config();
const pool = require('./db/pool');
const fs = require('fs');
async function testApi() {
    try {
        const {rows} = await pool.query(`SELECT email, password_hash, id, tenant_id FROM users WHERE role='superadmin' LIMIT 1`);
        if(!rows.length) { console.log('No superadmin'); process.exit(0); }
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: rows[0].id, tenantId: rows[0].tenant_id, role: 'superadmin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        const res = await fetch(`http://localhost:5050/api/users/${rows[0].id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ telephony_agent_id: 'API_TEST_1' })
        });
        
        const data = await res.json();
        fs.writeFileSync('test_output.json', JSON.stringify(data));
        console.log("Done");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
testApi();
