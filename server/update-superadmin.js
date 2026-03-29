const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db/pool');

async function main() {
    try {
        console.log('Generating hash for Cyber@2026!');
        const hash = await bcrypt.hash('Cyber@2026!', 12);
        
        // 1. Check if ANY superadmin exists
        const { rows: superAdmins } = await pool.query("SELECT id FROM users WHERE role = 'superadmin'");
        
        if (superAdmins.length > 0) {
            // Update the first superadmin
            await pool.query(
                "UPDATE users SET email = $1, password_hash = $2, name = $3 WHERE id = $4",
                ['rohan.mishra@zentrixcrm.com', hash, 'Rohan Mishra', superAdmins[0].id]
            );
            console.log('✅ Successfully updated existing superadmin credentials.');
        } else {
            // 2. Fallback: maybe the admin was defined with role='admin' but email='arjun@zentrix.com'?
            const { rows: oldAdmins } = await pool.query("SELECT id FROM users WHERE email = 'arjun@zentrix.com'");
            if (oldAdmins.length > 0) {
                await pool.query(
                    "UPDATE users SET email = $1, password_hash = $2, name = $3, role = 'superadmin' WHERE id = $4",
                    ['rohan.mishra@zentrixcrm.com', hash, 'Rohan Mishra', oldAdmins[0].id]
                );
                console.log('✅ Successfully transformed old admin to superadmin with new credentials.');
            } else {
                // 3. Create completely new superadmin attached to first tenant
                const { rows: tenants } = await pool.query("SELECT id FROM tenants LIMIT 1");
                if (tenants.length > 0) {
                    await pool.query(
                        "INSERT INTO users (tenant_id, name, email, password_hash, role, avatar) VALUES ($1, $2, $3, $4, 'superadmin', 'RM')",
                        [tenants[0].id, 'Rohan Mishra', 'rohan.mishra@zentrixcrm.com', hash]
                    );
                    console.log('✅ Successfully created new superadmin with new credentials.');
                } else {
                    console.log('❌ Failed: No tenants found to attach superadmin to.');
                }
            }
        }
    } catch (err) {
        console.error('❌ Error updating superadmin:', err);
    } finally {
        pool.end();
    }
}

main();
