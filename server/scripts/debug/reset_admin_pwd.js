const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Cyber%402026!@db.uvnkbewvpewocaqzysqb.supabase.co:5432/postgres' });

async function reset() {
    try {
        const hash = await bcrypt.hash('Maya@2026', 12);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'admin@mayainfratech.in']);
        console.log('✅ Password reset successful for admin@mayainfratech.in');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed:', err.message);
        process.exit(1);
    }
}

reset();
