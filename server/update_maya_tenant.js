const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const tenantData = {
    slug: 'mayainfratech',
    name: 'Maya Infratech', // From web search
    logo_url: 'https://www.google.com/s2/favicons?domain=mayainfratech.in&sz=128', // Fallback since SPA scraping blocked
    primary_color: '#06b6d4' // A good modern color matching the earlier quick demo card default
};

async function updateTenant() {
    try {
        const { rowCount } = await pool.query(
            `UPDATE tenants SET name=$1, logo_url=$2, primary_color=$3 WHERE slug=$4 RETURNING *`,
            [tenantData.name, tenantData.logo_url, tenantData.primary_color, tenantData.slug]
        );
        console.log(`Updated ${rowCount} tenant(s).`);
        
        const { rows } = await pool.query(`SELECT id, name, logo_url, primary_color FROM tenants WHERE slug=$1`, [tenantData.slug]);
        console.log("Current Tenant Record:", rows[0]);

    } catch (err) {
        console.error("Failed to update tenant:", err);
    } finally {
        pool.end();
    }
}
updateTenant();
