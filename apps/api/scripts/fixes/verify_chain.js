const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    const tid = '6f023c0a-a505-4ae4-962a-038a944d500e';
    const { rows } = await pool.query(
        `SELECT id, name, role, reports_to FROM users WHERE tenant_id=$1 AND is_active=TRUE ORDER BY role, name`, [tid]
    );
    
    console.log('=== HIERARCHY CHAIN VERIFICATION ===\n');
    rows.forEach(u => {
        const parent = u.reports_to ? rows.find(p => p.id === u.reports_to) : null;
        const parentName = parent ? parent.name : (u.reports_to ? 'BROKEN LINK: ' + u.reports_to : 'ROOT');
        const children = rows.filter(c => c.reports_to === u.id);
        console.log(`${u.role.padEnd(15)} ${u.name.padEnd(25)} ID:${u.id.substring(0,8)} -> Parent:${parentName.padEnd(25)} Children:[${children.map(c=>c.name).join(', ')}]`);
    });
    
    const roots = rows.filter(u => !u.reports_to);
    const brokenLinks = rows.filter(u => u.reports_to && !rows.find(p => p.id === u.reports_to));
    console.log(`\nRoots: ${roots.length}, Broken Links: ${brokenLinks.length}, Total: ${rows.length}`);
    if (brokenLinks.length) {
        console.log('\nBROKEN LINKS:');
        brokenLinks.forEach(u => console.log('  ' + u.name + ' -> ' + u.reports_to));
    }
    pool.end();
}
run();
