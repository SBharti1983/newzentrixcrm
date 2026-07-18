/**
 * Rohan Objection & Phase Replay
 *
 * Drives the real RohanCognitiveLoop with a scripted multi-turn caller
 * conversation that triggers objection playbooks and call phase state transitions.
 * After the conversation completes, queries the database and prints the reasoning log
 * and lead changes — proving the end-to-end Phase 2 sales intelligence works.
 *
 * Usage:
 *   npx tsx tools/scripts/voice/rohan_objection_replay.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// ── Phase 1: Load env BEFORE any pool-touching imports ─────────────
config({ path: resolve(__dirname, '../../../apps/api/.env') });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in apps/api/.env — cannot connect.');
    process.exit(1);
}

process.env.REDIS_DISABLED = '1';

// ── Phase 2: Dynamic imports ────────────────────────────────────────
type CognitiveInput = any;
let pool: any;
let rohanCognitiveLoop: any;

const TENANT_ID = '1bbc00c0-766f-498d-9814-b9fdeb56b24d' as unknown as number; // Maya Infratech
const ROHAN_PERSONA_ID = 'ZEN-AI-001'; // Rohan Mishra
const LEAD_ID = '75db6096-0dd0-4b19-8d8c-3f4188b2abfe'; // Haresh Kumar (Active in DB)
const CALLER_PHONE = '+919876543210';
const CALLER_NAME = 'Vikram Malhotra';

// ── Scripted caller conversation (drives the sales objections) ──────
const SCRIPT = [
    { text: 'Hello, mera naam Vikram hai. Main Mumbai me ek luxury 2BHK ya 3BHK flat dekh raha hoon.' },
    { text: 'Haan, BKC Phase 2 ke baare me bataiye. Price range kya hai aur available configuration kya hain?' },
    { text: 'Lekin start price 2 Crore hai? Ye toh mere budget se bahut zyada hai, itna heavy price kaise justify kar rahe hain aap?' },
    { text: 'Acha, and location wise traffic ka kya scene hai? BKC me toh office hours me jam laga rehta hai.' },
    { text: 'Theek hai, subvention scheme helpful lag rahi hai. Main physical property dekhna chahta hoon, kya main weekend par visit schedule kar sakta hoon?' }
];

function banner(title: string) {
    const line = '═'.repeat(Math.max(title.length + 4, 70));
    console.log('\n' + line);
    console.log(`  ${title}`);
    console.log(line);
}

function step(msg: string) {
    console.log(`\n▶ ${msg}`);
}

async function runReplay() {
    const db = await import('@zentrix/database');
    pool = db.pool;
    const rohanModule = await import('../../../apps/digital-employee/src/agent/RohanAgent');
    rohanCognitiveLoop = rohanModule.default;

    banner('ROHAN SALES REPLAY — Objection Playbooks & Phase State Machine');
    console.log(`Tenant : ${TENANT_ID}`);
    console.log(`Lead   : ${LEAD_ID} (${CALLER_NAME})`);
    console.log(`Script : ${SCRIPT.length} turns`);

    // Ensure the lead is assigned to "BKC Phase 2" project for testing
    const { rows: projects } = await pool.query(
        'SELECT id FROM projects WHERE tenant_id = $1::uuid AND name = $2 LIMIT 1',
        [TENANT_ID, 'BKC Phase 2']
    );
    if (projects.length > 0) {
        await pool.query(
            'UPDATE leads SET project_id = $1 WHERE id = $2',
            [projects[0].id, LEAD_ID]
        );
        console.log(`✓ Assigned lead to "BKC Phase 2" project`);
    } else {
        console.warn('⚠️ "BKC Phase 2" project not found in database. Seed script must be run first.');
    }

    // Reset lead's conversation state memory
    await pool.query(
        'DELETE FROM ai_conversation_memory WHERE tenant_id = $1::uuid AND lead_id = $2',
        [TENANT_ID, LEAD_ID]
    );

    const reasoningPromises: Promise<any>[] = [];

    for (let i = 0; i < SCRIPT.length; i++) {
        const turn = SCRIPT[i];
        step(`Turn ${i + 1}/${SCRIPT.length} — Caller: "${turn.text}"`);

        const input = {
            tenant_id: TENANT_ID,
            persona_id: ROHAN_PERSONA_ID,
            channel: 'voice',
            user_message: turn.text,
            detected_language: 'hinglish',
            lead_id: LEAD_ID,
            user_phone: CALLER_PHONE,
            caller_name: CALLER_NAME
        } as CognitiveInput;

        const t0 = Date.now();
        const result = await rohanCognitiveLoop.processCycle(input);
        const trackAMs = Date.now() - t0;

        console.log(`  ├─ Track A response (${trackAMs}ms): "${result.fast_response.text}"`);
        console.log(`  ├─ memory_id: ${result.memory_id}`);
        console.log(`  └─ turn_number: ${result.turn_number}`);

        reasoningPromises.push(result.reasoning_promise);
    }

    step('Awaiting background reasoning resolution…');
    const reasoningResults = await Promise.allSettled(reasoningPromises);

    reasoningResults.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            const reasoning = r.value;
            console.log(`  Turn ${i + 1} reasoning: next_goal=${reasoning?.next_goal || 'n/a'}, action=${reasoning?.action || 'n/a'}`);
            if (reasoning?.objection) {
                console.log(`           ↳ OBJECTION: type=${reasoning.objection.type}, text="${reasoning.objection.text}"`);
            }
        }
    });

    await showReasoningLog();

    banner('REPLAY COMPLETE');
    await pool.end();
    process.exit(0);
}

async function showReasoningLog() {
    banner('ai_reasoning_log — turn-level objection & goal states');
    const { rows } = await pool.query(
        `SELECT turn_number, channel, user_input,
                reasoning_output->>'action'   AS action,
                reasoning_output->>'intent'   AS intent,
                reasoning_output->>'next_goal' AS next_goal,
                reasoning_output->'objection' AS objection,
                response_given,
                created_at
         FROM ai_reasoning_log
         WHERE lead_id = $1
         ORDER BY created_at ASC`,
        [LEAD_ID]
    );

    rows.forEach((r: any, i: number) => {
        console.log(`\n  ── Turn ${r.turn_number} ──────────────────────────────────`);
        console.log(`  User Input  : "${r.user_input}"`);
        console.log(`  Next Goal   : ${r.next_goal || '—'}`);
        console.log(`  Objection   : ${r.objection ? JSON.stringify(r.objection) : 'None'}`);
        console.log(`  Response    : "${r.response_given}"`);
    });
}

runReplay().catch((err) => {
    console.error('❌ Replay failed:', err);
    if (pool) pool.end().finally(() => process.exit(1));
});
