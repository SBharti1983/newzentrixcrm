const pool = require('./pool');

const upgradeDripForAB = async () => {
    try {
        await pool.query(`
            ALTER TABLE drip_steps 
            ADD COLUMN IF NOT EXISTS is_ab_test BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS subject_b TEXT,
            ADD COLUMN IF NOT EXISTS body_b TEXT;
        `);

        await pool.query(`
            ALTER TABLE drip_enrollments
            ADD COLUMN IF NOT EXISTS variant_assignment JSONB DEFAULT '{}';
            -- variant_assignment will store { "step_1": "A", "step_2": "B" }
        `);

        console.log('✅ Drip tables upgraded for A/B testing');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to upgrade drip tables:', err);
        process.exit(1);
    }
};

upgradeDripForAB();
