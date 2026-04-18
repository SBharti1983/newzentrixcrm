const pool = require('./pool');

const setupBattleCards = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('🔄 PROVISIONING BATTLE CARDS INFRASTRUCTURE...');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS project_battle_cards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                project_name TEXT NOT NULL,
                usp TEXT[] DEFAULT '{}',
                objections JSONB DEFAULT '[]',
                target_audience TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed some initial data for the current tenant if empty
        const { rows: tenants } = await client.query('SELECT id FROM tenants LIMIT 1');
        if (tenants.length > 0) {
            const tenantId = tenants[0].id;
            const { rowCount } = await client.query('SELECT 1 FROM project_battle_cards WHERE tenant_id = $1', [tenantId]);
            if (rowCount === 0) {
                console.log('🌱 Seeding initial Battle Cards...');
                await client.query(`
                    INSERT INTO project_battle_cards (tenant_id, project_name, usp, objections, target_audience)
                    VALUES 
                    ($1, 'Elan Epic', ARRAY['Self-sustainable ecosystem', 'Highest ROI in Sector 70', '9% Guaranteed Leasing'], '[{"q": "The price is higher than Sector 66", "a": "Highlight the commercial-to-residential ratio and the luxury anchor brands already signed."}]', 'High Net Worth Individuals, Institutional Investors'),
                    ($1, 'M3M Crown', ARRAY['0 KM from Dwarka Expressway', 'Ultra-luxury amenities', 'Immediate possession in Phase 1'], '[{"q": "Is the connectivity ready?", "a": "Show the latest Expressway completion photos and the direct metro link approval."}]', 'First-time luxury buyers, Ex-pats')
                `, [tenantId]);
            }
        }

        console.log('✅ Battle Cards infrastructure ready!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (client) client.release();
        process.exit();
    }
};

setupBattleCards();
