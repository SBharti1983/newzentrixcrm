/**
 * Unit tests for Rohan Human-Mimicry Enhancements (WhatsApp, CRM Automations & Reflection)
 *
 * Verifies:
 * 1. RohanAutomationEngine: triggers WhatsApp responses and records follow-up site visits / brochures interactions.
 * 2. processReflectionJob: pulls low-sentiment interactions, runs self-reflection analysis, and updates DB configurations.
 *
 * Run using: npx tsx tests/unit/rohanHuman.test.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../apps/api/.env') });

import assert from 'assert';

let pool: any;
let rohanAutomationEngine: any;
let processReflectionJob: any;

async function loadDependencies() {
    pool = (await import('@zentrix/database')).pool;
    rohanAutomationEngine = (await import('../../apps/api/src/modules/automation/workflows/RohanAutomationEngine')).default;
    processReflectionJob = (await import('../../apps/worker/src/jobs/reflectionJob')).processReflectionJob;
}

let testTenantId: string = '';
let testUserId: string = '';
const testPersonaId = 'b7b4a2e5-4f40-4252-87db-2b58b4b73bbf';
const testLeadId = 'd748f2aa-2780-452f-9812-4fb3dc5187bd';
const testInteractionId = 'e01c51be-6d4b-4a57-ab17-8e6fa39f5060';

async function setupTestData() {
    // 1. Create or get tenant
    const tenantRes = await pool.query(`
        INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, is_active)
        VALUES ('Human Test Tenant', 'human-test-tenant-slug', 'pro', 10, 1000, 10, TRUE)
        ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
        RETURNING id;
    `);
    testTenantId = tenantRes.rows[0].id;

    // 2. Create or get user
    const userRes = await pool.query(`
        INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
        VALUES ($1, 'Human Admin', 'human-admin@zentrix.com', 'dummy_hash', 'admin', TRUE)
        ON CONFLICT (tenant_id, email) DO UPDATE SET is_active = TRUE
        RETURNING id;
    `, [testTenantId]);
    testUserId = userRes.rows[0].id;

    // 3. Ensure an active test persona exists for tenant
    await pool.query(`
        INSERT INTO ai_employee_personas (
            id, tenant_id, user_id, employee_name, employee_code, role, avatar_url,
            persona_config, voice_config, knowledge_scope, escalation_rules, is_active
        ) VALUES (
            $1, $2, $3, 'Rohan Mishra', 'ZRX-HUMAN', 'rohan', 'http://avatar.jpg',
            '{"language": "hinglish", "reflectionEnabled": true, "automationsEnabled": true}', '{}',
            '{"boundaries": "Original boundaries text."}', '{}', TRUE
        ) ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
    `, [testPersonaId, testTenantId, testUserId]);

    // 4. Insert a test lead for tenant
    await pool.query(`
        INSERT INTO leads (
            id, tenant_id, name, phone, stage, status, notes
        ) VALUES (
            $1, $2, 'Sikandar Bharti', '+919876543210', 'New', 'Active', 'Initial notes.'
        ) ON CONFLICT (id) DO UPDATE SET stage = 'New';
    `, [testLeadId, testTenantId]);

    // 5. Insert a negative sentiment interaction for reflection
    await pool.query(`
        INSERT INTO interactions (
            id, tenant_id, lead_id, user_id, type, date, note, transcript, sentiment, outcome, rapport_score
        ) VALUES (
            $1, $2, $3, $4, 'Call', NOW(),
            'Client objects to the distance from Sector 62.', 'Client: Project is too far. Rohan: Noida flyover is 12 mins.',
            'negative', 'Objection Raised', 5
        ) ON CONFLICT (id) DO UPDATE SET sentiment = 'negative';
    `, [testInteractionId, testTenantId, testLeadId, testUserId]);
}

async function cleanupTestData() {
    if (testTenantId) {
        await pool.query(`DELETE FROM interactions WHERE tenant_id = $1`, [testTenantId]);
        await pool.query(`DELETE FROM followups WHERE tenant_id = $1`, [testTenantId]);
        await pool.query(`DELETE FROM leads WHERE tenant_id = $1`, [testTenantId]);
        await pool.query(`DELETE FROM ai_employee_personas WHERE tenant_id = $1`, [testTenantId]);
        await pool.query(`DELETE FROM users WHERE tenant_id = $1`, [testTenantId]);
        await pool.query(`DELETE FROM tenants WHERE id = $1`, [testTenantId]);
    }
}

async function runTests() {
    console.log('\n🧪 Running Rohan Human-Mimicry Integration Tests...\n');
    let passed = 0;
    let failed = 0;

    try {
        await loadDependencies();
        await setupTestData();
    } catch (err: any) {
        console.error('❌ setupTestData failed:', err.message);
        process.exit(1);
    }

    // ── Test 1: RohanAutomationEngine (send_document) ──────────────────
    try {
        console.log('[Test 1] RohanAutomationEngine: send_document...');
        const result = await rohanAutomationEngine.executeTrigger({
            tenant_id: testTenantId,
            lead_id: testLeadId,
            action: 'send_document',
            notes: 'Test objection resolved'
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.message.includes('brochure'));

        // Verify interaction log was inserted in PostgreSQL database
        const { rows: logs } = await pool.query(
            `SELECT id, outcome FROM interactions WHERE lead_id = $1 AND outcome = 'Sent Brochure'`,
            [testLeadId]
        );
        assert.strictEqual(logs.length, 1);
        console.log('  ✅ Test 1: send_document completed successfully');
        passed++;
    } catch (err: any) {
        console.error('  ❌ Test 1 failed:', err.message);
        failed++;
    }

    // ── Test 2: RohanAutomationEngine (schedule_visit) ──────────────────
    try {
        console.log('[Test 2] RohanAutomationEngine: schedule_visit...');
        const result = await rohanAutomationEngine.executeTrigger({
            tenant_id: testTenantId,
            lead_id: testLeadId,
            action: 'schedule_visit',
            notes: 'Scheduling Sunday site visit'
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.message.includes('site visit'));

        // Verify callback followup was scheduled in PostgreSQL database
        const { rows: followups } = await pool.query(
            `SELECT id, type, priority FROM followups WHERE lead_id = $1 AND type = 'Site Visit'`,
            [testLeadId]
        );
        assert.strictEqual(followups.length, 1);
        assert.strictEqual(followups[0].priority, 'High');
        console.log('  ✅ Test 2: schedule_visit completed successfully');
        passed++;
    } catch (err: any) {
        console.error('  ❌ Test 2 failed:', err.message);
        failed++;
    }

    // ── Test 3: processReflectionJob (Self-Reflection Loop) ─────────────
    try {
        console.log('[Test 3] processReflectionJob: self-reflection loop...');
        await processReflectionJob();

        // Verify that Rohan\'s knowledge boundaries were updated with Noida Sector 62 connectivity flyover guidelines
        const { rows: personas } = await pool.query(
            `SELECT knowledge_scope FROM ai_employee_personas WHERE tenant_id = $1`,
            [testTenantId]
        );
        const scope = personas[0]?.knowledge_scope || {};
        assert.ok(scope.boundaries && scope.boundaries !== 'Original boundaries text.');
        assert.ok(scope.boundaries.toLowerCase().includes('sector 62'));
        console.log('  ✅ Test 3: self-reflection loop completed successfully');
        passed++;
    } catch (err: any) {
        console.error('  ❌ Test 3 failed:', err.message);
        failed++;
    }

    // Cleanup
    try {
        await cleanupTestData();
    } catch (err: any) {
        console.warn('⚠️ cleanupTestData failed:', err.message);
    }

    console.log(`\n📊 Test Run Summary:`);
    console.log(`-------------------`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('\n🎉 All human-mimicry tests passed successfully!\n');
        process.exit(0);
    }
}

runTests();
