import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../apps/api/.env') });

let pool: any;

async function seed() {
    console.log('🌱 Seeding project battle cards...');
    
    const db = await import('@zentrix/database');
    pool = db.pool;
    
    // Get all tenants
    const { rows: tenants } = await pool.query('SELECT id, name FROM tenants');
    if (tenants.length === 0) {
        console.warn('⚠️ No tenants found to seed battle cards for.');
        process.exit(0);
    }

    // Insert dummy projects if none exist
    for (const tenant of tenants) {
        // Find or create a dummy project "BKC Phase 2"
        const { rows: existingProjects } = await pool.query(
            'SELECT id FROM projects WHERE tenant_id = $1 AND name = $2',
            [tenant.id, 'BKC Phase 2']
        );
        
        let projectId;
        if (existingProjects.length === 0) {
            const { rows: inserted } = await pool.query(
                `INSERT INTO projects (tenant_id, name, location, price_range, description, amenities, available_units)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    tenant.id,
                    'BKC Phase 2',
                    'Bandra Kurla Complex, Mumbai',
                    '₹2.0Cr - ₹5.0Cr',
                    'Premium luxury apartments in the heart of BKC with top-notch amenities.',
                    JSON.stringify(['Pool', 'Gym', 'Clubhouse', '24/7 Security']),
                    24
                ]
            );
            projectId = inserted[0].id;
            console.log(`✓ Created project "BKC Phase 2" for tenant ${tenant.name} (${tenant.id})`);
        } else {
            projectId = existingProjects[0].id;
        }

        // Delete any existing battle cards for "BKC Phase 2" to ensure clean seed
        await pool.query(
            'DELETE FROM project_battle_cards WHERE tenant_id = $1 AND LOWER(project_name) = LOWER($2)',
            [tenant.id, 'BKC Phase 2']
        );

        // Insert battle cards
        await pool.query(
            `INSERT INTO project_battle_cards (tenant_id, project_name, usp, target_audience, objections, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                tenant.id,
                'BKC Phase 2',
                [
                    'Location: Prime business district, 10 min to airport.',
                    'RERA Certified: Under construction, possession in Dec 2026.',
                    'Pricing: Most competitive rate per sqft in BKC area.',
                    'Financing: Special 3.9% developer subvention scheme available.'
                ],
                'High-net-worth individuals, corporate executives, premium home seekers',
                JSON.stringify([
                    {
                        type: 'price',
                        text: 'price is too high, out of my budget',
                        strategy: 'Highlight our 3.9% developer subvention interest rate scheme and the superior appreciation rate of 12% YoY in the BKC business hub.'
                    },
                    {
                        type: 'location',
                        text: 'traffic in BKC is terrible',
                        strategy: 'Emphasize that Phase 2 has direct tunnel access to the Eastern Express Highway, bypassing the main BKC junctions completely.'
                    },
                    {
                        type: 'competition',
                        text: 'other builders are offering cheaper rates nearby',
                        strategy: 'Point out our double-height lobby, Grade-A construction quality (Mivan formwork), and the fact that we have 4.8 RERA compliance rating vs competitor\'s 3.2.'
                    },
                    {
                        type: 'timing',
                        text: 'not ready to buy right now, possession is far',
                        strategy: 'Explain that booking today locks in the pre-launch price, saving over ₹25 Lakhs compared to possession-time prices.'
                    }
                ]),
                true
            ]
        );
        console.log(`✓ Seeded battle cards for project "BKC Phase 2" (tenant: ${tenant.name})`);
    }

    console.log('✅ Seeding completed successfully!');
    await pool.end();
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    pool.end().finally(() => process.exit(1));
});
