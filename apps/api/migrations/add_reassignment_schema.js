const pool = require('./pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Adding assigned_by to followups...');
        await client.query(`
            ALTER TABLE followups 
            ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL
        `);

        console.log('2. Adding assigned_at to leads...');
        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        console.log('3. Copying note to notes in followups table for consistency...');
        await client.query(`
            UPDATE followups 
            SET notes = note 
            WHERE notes IS NULL AND note IS NOT NULL
        `);

        console.log('4. Backfilling assigned_at for existing leads...');
        await client.query(`
            UPDATE leads 
            SET assigned_at = COALESCE(created_at, CURRENT_TIMESTAMP) 
            WHERE assigned_to IS NOT NULL AND assigned_at IS NULL
        `);

        console.log('5. Creating update_lead_assigned_at function & trigger...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_lead_assigned_at()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
                   (TG_OP = 'UPDATE' AND (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)) THEN
                    NEW.assigned_at = CURRENT_TIMESTAMP;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS trg_update_lead_assigned_at ON leads;
            CREATE TRIGGER trg_update_lead_assigned_at
            BEFORE INSERT OR UPDATE ON leads
            FOR EACH ROW
            EXECUTE FUNCTION update_lead_assigned_at();
        `);

        await client.query('COMMIT');
        console.log('\n✅ Reassignment & Follow-up migrations applied successfully!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e.message);
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
