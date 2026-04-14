require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createTeamLeader() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        const tid = tenantRes.rows[0].id;
        
        const name = 'Vikram Leader';
        const email = 'vikram.leader@zentrixcrm.com';
        const password = 'Leader@123';
        const role = 'team_leader';
        const hash = await bcrypt.hash(password, 10);

        const res = await pool.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            ON CONFLICT (tenant_id, email) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash
            RETURNING id, name, email, role
        `, [tid, name, email, hash, role]);

        console.log('✅ Team Leader user created successfully:');
        console.table(res.rows);
        console.log('\nLogin Details:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (err) {
        console.error('❌ Failed to create user:', err.message);
    } finally {
        await pool.end();
    }
}

createTeamLeader();
