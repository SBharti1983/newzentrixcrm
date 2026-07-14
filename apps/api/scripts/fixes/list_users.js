import pool from '../server/db/pool.js';

async function checkUser() {
    try {
        const { rows } = await pool.query('SELECT id, name, email, role, is_active FROM users');
        console.log('--- USERS IN DATABASE ---');
        console.table(rows);
        
        const tenantCheck = await pool.query('SELECT id, name, slug, is_active FROM tenants');
        console.log('\n--- TENANTS IN DATABASE ---');
        console.table(tenantCheck.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUser();
