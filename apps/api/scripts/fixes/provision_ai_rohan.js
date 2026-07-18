/**
 * Provision AI Rohan User Account
 * 
 * Creates:
 * 1. Adds is_ai_employee and ai_persona_id columns to users table
 * 2. Adds user_id, telephony, and whatsapp columns to ai_employee_personas
 * 3. Creates AI Rohan user account (ai4rohanmishra@gmail.com)
 * 4. Links user <-> persona bidirectionally
 * 5. Creates ai_feedback and ai_teaching_examples tables
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function provision() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🔧 Starting AI Rohan provisioning...\n');

        // ── Step 0: Create ai_employee_personas table if not exists ──
        console.log('0️⃣  Creating core AI tables (from rohan_ai_employee_v1 migration)...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_employee_personas (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                employee_name   VARCHAR(100) NOT NULL DEFAULT 'Rohan Mishra',
                employee_code   VARCHAR(50)  NOT NULL DEFAULT 'ZEN-AI-001',
                role            VARCHAR(100) NOT NULL DEFAULT 'Senior Sales Associate',
                avatar_url      TEXT,
                persona_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
                voice_config    JSONB NOT NULL DEFAULT '{}'::jsonb,
                knowledge_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
                escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
                is_active       BOOLEAN NOT NULL DEFAULT TRUE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS ai_conversation_memory (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                persona_id      UUID NOT NULL,
                lead_id         UUID,
                channel         VARCHAR(20) NOT NULL,
                conversation_state JSONB NOT NULL DEFAULT '{}'::jsonb,
                last_reasoning  JSONB,
                last_reasoning_at TIMESTAMPTZ,
                expires_at      TIMESTAMPTZ,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_ai_memory_tenant_lead ON ai_conversation_memory(tenant_id, lead_id);

            CREATE TABLE IF NOT EXISTS ai_reasoning_log (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                persona_id      UUID NOT NULL,
                lead_id         UUID,
                memory_id       UUID,
                turn_number     INTEGER NOT NULL DEFAULT 0,
                channel         VARCHAR(20) NOT NULL,
                user_input      TEXT,
                reasoning_output JSONB NOT NULL,
                response_given  TEXT,
                latency_ms      INTEGER,
                reasoning_ms    INTEGER,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_ai_reasoning_tenant_lead ON ai_reasoning_log(tenant_id, lead_id);
            CREATE INDEX IF NOT EXISTS idx_ai_reasoning_created ON ai_reasoning_log(created_at DESC);

            CREATE TABLE IF NOT EXISTS ai_escalation_events (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                persona_id      UUID NOT NULL,
                lead_id         UUID,
                memory_id       UUID,
                escalation_type VARCHAR(50) NOT NULL,
                trigger_reason  TEXT NOT NULL,
                suggested_role  VARCHAR(100),
                status          VARCHAR(20) NOT NULL DEFAULT 'pending',
                resolved_by     UUID,
                resolved_at     TIMESTAMPTZ,
                metadata        JSONB DEFAULT '{}'::jsonb,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_ai_escalation_tenant_status ON ai_escalation_events(tenant_id, status);

            CREATE TABLE IF NOT EXISTS ai_employee_metrics (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                persona_id      UUID NOT NULL,
                metric_date     DATE NOT NULL,
                calls_inbound   INTEGER NOT NULL DEFAULT 0,
                calls_outbound  INTEGER NOT NULL DEFAULT 0,
                whatsapp_msgs   INTEGER NOT NULL DEFAULT 0,
                escalations     INTEGER NOT NULL DEFAULT 0,
                leads_qualified INTEGER NOT NULL DEFAULT 0,
                site_visits_booked INTEGER NOT NULL DEFAULT 0,
                avg_call_duration_sec INTEGER NOT NULL DEFAULT 0,
                avg_response_latency_ms INTEGER NOT NULL DEFAULT 0,
                csat_score      DECIMAL(3,2),
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('   ✅ Core AI tables ready\n');

        // ── Step 1: Add AI columns to users table ─────────────────────
        console.log('1️⃣  Adding is_ai_employee column to users table...');
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ai_employee BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_persona_id UUID;
        `);
        console.log('   ✅ users table updated\n');

        // ── Step 2: Add telephony/whatsapp columns to personas ────────
        console.log('2️⃣  Adding telephony/whatsapp columns to ai_employee_personas...');
        await client.query(`
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS user_id UUID;
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS telephony_number VARCHAR(20);
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS telephony_provider VARCHAR(50);
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS telephony_config JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS whatsapp_provider VARCHAR(50);
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS max_concurrent_calls INTEGER DEFAULT 10;
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS max_daily_outbound INTEGER DEFAULT 200;
            ALTER TABLE ai_employee_personas ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"start":"09:00","end":"21:00","timezone":"Asia/Kolkata","days":[1,2,3,4,5,6]}'::jsonb;
        `);
        console.log('   ✅ ai_employee_personas table updated\n');

        // ── Step 3: Create ai_feedback table ──────────────────────────
        console.log('3️⃣  Creating ai_feedback table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_feedback (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                persona_id      UUID NOT NULL,
                reviewer_id     UUID NOT NULL,
                reasoning_log_id UUID,
                lead_id         UUID,
                rating          VARCHAR(10) NOT NULL,
                correction      TEXT,
                correction_category VARCHAR(50),
                ai_response     TEXT,
                human_response  TEXT,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_ai_feedback_persona ON ai_feedback(persona_id);
            CREATE INDEX IF NOT EXISTS idx_ai_feedback_category ON ai_feedback(correction_category);
            CREATE INDEX IF NOT EXISTS idx_ai_feedback_reviewer ON ai_feedback(reviewer_id);
        `);
        console.log('   ✅ ai_feedback table created\n');

        // ── Step 4: Create ai_teaching_examples table ─────────────────
        console.log('4️⃣  Creating ai_teaching_examples table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_teaching_examples (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                persona_id      UUID NOT NULL,
                teacher_id      UUID NOT NULL,
                category        VARCHAR(50) NOT NULL,
                scenario        TEXT NOT NULL,
                human_response  TEXT NOT NULL,
                audio_url       TEXT,
                is_active       BOOLEAN DEFAULT TRUE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_ai_teaching_persona ON ai_teaching_examples(persona_id, category);
        `);
        console.log('   ✅ ai_teaching_examples table created\n');

        // ── Step 5: Get the tenant ID ─────────────────────────────────
        console.log('5️⃣  Looking up tenant...');
        const { rows: tenantRows } = await client.query(
            `SELECT id FROM tenants ORDER BY id ASC LIMIT 1`
        );
        if (tenantRows.length === 0) {
            throw new Error('No tenant found! Run the main setup first.');
        }
        const tenantId = tenantRows[0].id;
        console.log(`   ✅ Tenant ID: ${tenantId}\n`);

        // ── Step 6: Check if AI Rohan already exists ──────────────────
        console.log('6️⃣  Checking if AI Rohan account already exists...');
        const { rows: existingUser } = await client.query(
            `SELECT id FROM users WHERE email = 'ai4rohanmishra@gmail.com' AND tenant_id = $1`,
            [tenantId]
        );

        let userId;
        if (existingUser.length > 0) {
            userId = existingUser[0].id;
            console.log(`   ⚡ AI Rohan already exists (ID: ${userId}). Updating...\n`);
            
            const hash = await bcrypt.hash('Cyber@2027', 10);
            await client.query(`
                UPDATE users SET 
                    name = 'Rohan Mishra (AI)',
                    password_hash = $1,
                    role = 'ai_employee',
                    is_ai_employee = TRUE,
                    phone = NULL,
                    department = 'Sales',
                    is_active = TRUE,
                    avatar = 'RM',
                    updated_at = NOW()
                WHERE id = $2
            `, [hash, userId]);
        } else {
            // ── Step 7: Create AI Rohan user account ──────────────────
            console.log('7️⃣  Creating AI Rohan user account...');
            const hash = await bcrypt.hash('Cyber@2027', 10);

            const { rows: newUser } = await client.query(`
                INSERT INTO users (tenant_id, name, email, password_hash, role, avatar, phone, department, is_active, is_ai_employee)
                VALUES ($1, 'Rohan Mishra (AI)', 'ai4rohanmishra@gmail.com', $2, 'ai_employee', 'RM', NULL, 'Sales', TRUE, TRUE)
                RETURNING id
            `, [tenantId, hash]);

            userId = newUser[0].id;
            console.log(`   ✅ AI Rohan user created (ID: ${userId})\n`);
        }

        // ── Step 8: Link to existing persona ──────────────────────────
        console.log('8️⃣  Linking AI Rohan to persona...');
        const { rows: personas } = await client.query(
            `SELECT id FROM ai_employee_personas WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`,
            [tenantId]
        );

        if (personas.length > 0) {
            const personaId = personas[0].id;

            // Bidirectional link
            await client.query(
                `UPDATE users SET ai_persona_id = $1 WHERE id = $2`,
                [personaId, userId]
            );
            await client.query(
                `UPDATE ai_employee_personas SET user_id = $1 WHERE id = $2`,
                [userId, personaId]
            );

            console.log(`   ✅ Linked: User ${userId} <-> Persona ${personaId}\n`);
        } else {
            console.log('   ⚠️  No active persona found. Creating default Rohan persona...');
            
            const { rows: newPersona } = await client.query(`
                INSERT INTO ai_employee_personas (
                    tenant_id, employee_name, employee_code, role, user_id,
                    persona_config, voice_config, knowledge_scope, escalation_rules
                ) VALUES (
                    $1, 'Rohan Mishra', 'ZEN-AI-001', 'Senior Sales Associate', $2,
                    '{"personality":"warm, professional, patient","tone":"conversational, respectful","language_style":"natural code-mix (Hindi-English)","greeting_style":"Namaste {name} ji, main Rohan hoon Zentrix Realty se","patience_level":"high","humor":"light, contextual","filler_words":["hmm","theek hai","samajh gaya","ek second"]}'::jsonb,
                    '{"hindi_voice":"sarvam-mukesh","english_voice":"cartesia-neutral-male","code_mix_voice":"sarvam-mukesh","speed":1.0,"pitch":1.0}'::jsonb,
                    '{"projects":"all_active","faqs":"pricing, payment_plans, rera, site_visit, amenities","inventory":"live_availability","boundaries":"never_commit_discounts, never_give_legal_advice"}'::jsonb,
                    '{"discount_request":{"action":"notify","role":"sales_manager"},"legal_question":{"action":"notify","role":"legal_team"},"negative_sentiment_below":-0.6,"booking_intent":{"action":"warm_transfer","role":"booking_team"},"conversation_confusion":{"action":"human_takeover"},"max_conversation_minutes":8}'::jsonb
                ) RETURNING id
            `, [tenantId, userId]);

            await client.query(
                `UPDATE users SET ai_persona_id = $1 WHERE id = $2`,
                [newPersona[0].id, userId]
            );

            console.log(`   ✅ Created & linked persona (ID: ${newPersona[0].id})\n`);
        }

        // ── Step 9: Verify ────────────────────────────────────────────
        console.log('9️⃣  Verifying setup...');
        const { rows: verifyUser } = await client.query(`
            SELECT u.id, u.name, u.email, u.role, u.is_ai_employee, u.ai_persona_id,
                   p.employee_name, p.employee_code, p.role as persona_role
            FROM users u
            LEFT JOIN ai_employee_personas p ON u.ai_persona_id = p.id
            WHERE u.id = $1
        `, [userId]);

        await client.query('COMMIT');

        console.log('\n═══════════════════════════════════════════════════');
        console.log('  🤖 AI ROHAN ACCOUNT PROVISIONED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('  Account Details:');
        console.log(`  ├─ Name:      ${verifyUser[0].name}`);
        console.log(`  ├─ Email:     ${verifyUser[0].email}`);
        console.log(`  ├─ Role:      ${verifyUser[0].role}`);
        console.log(`  ├─ AI Flag:   ${verifyUser[0].is_ai_employee}`);
        console.log(`  ├─ User ID:   ${verifyUser[0].id}`);
        console.log(`  ├─ Persona:   ${verifyUser[0].employee_name} (${verifyUser[0].employee_code})`);
        console.log(`  └─ Persona Role: ${verifyUser[0].persona_role}`);
        console.log('');
        console.log('  Login:');
        console.log('  ├─ Email:     ai4rohanmishra@gmail.com');
        console.log('  └─ Password:  Cyber@2027');
        console.log('');
        console.log('  Next Steps:');
        console.log('  1. Manager can now assign leads to "Rohan Mishra (AI)"');
        console.log('  2. AI Rohan will appear in team list & leaderboard');
        console.log('  3. Build the /rohan-dashboard monitoring page');
        console.log('═══════════════════════════════════════════════════\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Provisioning failed:', err.message);
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

provision();
