/**
 * Fix all missing columns and tables in Supabase
 */
const pool = require('./pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Missing user columns (Academy/Gamification)
        console.log('1. Adding missing user columns...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1');
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_title TEXT DEFAULT 'Rookie'`);

        // 2. Training progress table (Academy)
        console.log('2. Creating training_progress table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS training_progress (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                module_id TEXT,
                module_name TEXT,
                best_score INTEGER DEFAULT 0,
                attempts INTEGER DEFAULT 0,
                is_certified BOOLEAN DEFAULT false,
                completed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Battle cards table (Academy)
        console.log('3. Creating battle_cards table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS battle_cards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                category TEXT,
                content JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Missing lead columns
        console.log('4. Adding missing lead columns...');
        await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL');
        await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary TEXT');
        await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_next_action TEXT');
        await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_score INTEGER');

        // 5. Missing interaction columns
        console.log('5. Adding missing interaction columns...');
        await client.query('ALTER TABLE interactions ADD COLUMN IF NOT EXISTS call_sid TEXT');
        await client.query('ALTER TABLE interactions ADD COLUMN IF NOT EXISTS direction TEXT');

        // 6. Missing followup columns
        console.log('6. Adding missing followup columns...');
        await client.query('ALTER TABLE followups ADD COLUMN IF NOT EXISTS notes TEXT');

        // 7. Missing tenant columns (Branding)
        console.log('7. Adding missing tenant/branding columns...');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sidebar_color TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accent_color TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tagline TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS powered_by BOOLEAN DEFAULT true');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS login_banner_text TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_text TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_email TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_phone TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_icon TEXT');
        await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name TEXT');

        // 8. Commissions Table
        console.log('8. Creating commissions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS commissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                entity_type TEXT NOT NULL, -- 'Internal' or 'Channel Partner'
                entity_id UUID NOT NULL,
                lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
                booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
                deal_value NUMERIC(15,2),
                commission_rate NUMERIC(5,2),
                payout_amount NUMERIC(15,2),
                status TEXT DEFAULT 'Pending',
                paid_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 9. Channel Partners Table
        console.log('9. Creating channel_partners table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS channel_partners (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                company TEXT,
                email TEXT,
                phone TEXT,
                city TEXT,
                rera_number TEXT,
                commission_rate NUMERIC(5,2),
                total_leads_referred INTEGER DEFAULT 0,
                total_bookings INTEGER DEFAULT 0,
                total_commission NUMERIC(15,2) DEFAULT 0,
                status TEXT DEFAULT 'Active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('COMMIT');
        console.log('\n✅ All migrations applied successfully!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
