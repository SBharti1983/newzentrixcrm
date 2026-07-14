require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    try {
        const { rows: tRows } = await pool.query("SELECT id FROM tenants WHERE slug='zentrix'");
        if (!tRows.length) {
            console.log('No tenant found. Run seed.js first.');
            return;
        }
        const tid = tRows[0].id;

        const { rows: pRows } = await pool.query("SELECT id FROM projects WHERE tenant_id=$1 LIMIT 3", [tid]);
        if (!pRows.length) {
            console.log('No projects found.');
            return;
        }

        console.log('Inserting inventory items...');

        // Clear existing demo inventory just in case to show fresh data
        await pool.query("DELETE FROM inventory WHERE tenant_id=$1", [tid]);

        let count = 101;
        for (const p of pRows) {
            for (let i = 0; i < 8; i++) {
                await pool.query(`
                    INSERT INTO inventory (tenant_id, project_id, unit_no, floor, area_sqft, property_type, facing, base_price, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT DO NOTHING
                `, [
                    tid,
                    p.id,
                    `A-${count++}`,
                    Math.floor(Math.random() * 15) + 1,
                    Math.floor(Math.random() * 800) + 800,
                    ['1BHK', '2BHK', '3BHK', '4BHK'][Math.floor(Math.random() * 4)],
                    ['East', 'West', 'North', 'South'][Math.floor(Math.random() * 4)],
                    (Math.floor(Math.random() * 90) + 40) * 100000,
                    ['Available', 'Booked', 'Sold'][Math.floor(Math.random() * 3)]
                ]);
            }
        }
        console.log('Inventory seeded successfully!');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
