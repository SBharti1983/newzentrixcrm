const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log('Seeding Nurture Demo Data...');
        
        // 1. Get some leads to update
        const { rows: leads } = await pool.query('SELECT id FROM leads LIMIT 15');
        
        if (leads.length < 5) {
            console.log('Not enough leads to seed. Please add more leads first.');
            process.exit(1);
        }

        const nurtureData = [
            { reason: 'Budget issue', date: new Date().toISOString() }, // Due Today
            { reason: 'Timeline delay', date: new Date(Date.now() - 86400000 * 2).toISOString() }, // Overdue
            { reason: 'No response', date: new Date(Date.now() + 86400000 * 5).toISOString() }, // Future
            { reason: 'Inventory mismatch', date: new Date(Date.now() - 3600000 * 5).toISOString() }, // Due Today (earlier)
            { reason: 'Contacted - Follow up later', date: new Date(Date.now() + 86400000 * 14).toISOString() } // Future
        ];

        for (let i = 0; i < Math.min(leads.length, 5); i++) {
            await pool.query(
                `UPDATE leads 
                 SET status = 'Nurture', 
                     nurture_reason = $1, 
                     reconnect_date = $2 
                 WHERE id = $3`,
                [nurtureData[i].reason, nurtureData[i].date, leads[i].id]
            );
        }

        console.log('Successfully seeded 5 leads into Nurture Module!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
