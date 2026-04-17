require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

(async () => {
    try {
        const hash = await bcrypt.hash('Cyber@2026!', 12);
        const { rows } = await pool.query('SELECT id FROM tenants LIMIT 1');
        if (!rows[0]) { console.error('No tenant found!'); process.exit(1); }
        const tid = rows[0].id;

        const res = await pool.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, is_active)
             VALUES ($1, 'Rohan Mishra', 'rohan.mishra@zentrixcrm.com', $2, 'superadmin', 'RM', '+91 99999 00000', true)
             ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $2, role = 'superadmin'
             RETURNING id, email, role`,
            [tid, hash]
        );
        console.log('✅ SuperAdmin created:', res.rows[0]);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await pool.end();
    }
})();
