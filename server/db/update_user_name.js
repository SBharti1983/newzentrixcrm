const pool = require('./pool');

async function update() {
    try {
        const query = "UPDATE users SET name = 'Rohan Kumar' WHERE email = 'rohan@zentrix.com' RETURNING *;";
        const res = await pool.query(query);
        if (res.rowCount > 0) {
            console.log('✅ User updated:', res.rows[0]);
        } else {
            console.log('⚠️ No user found with email rohan@zentrix.com');
            const res2 = await pool.query("UPDATE users SET name = 'Rohan Kumar' WHERE name ILIKE '%Rohan%' RETURNING *;");
            if (res2.rowCount > 0) {
                console.log('✅ Found and updated by name:', res2.rows[0]);
            } else {
                console.log('❌ No user found with name containing Rohan');
            }
        }
    } catch (err) {
        console.error('❌ Update failed:', err.message);
    } finally {
        process.exit();
    }
}

update();
