/**
 * Neha GST-Filing Replay
 *
 * Drives the real NehaCognitiveLoop with a scripted multi-turn caller
 * conversation that triggers `initiate_gst_filing`. After the conversation
 * completes, queries the database and prints the `ai_filing_tasks` and
 * `ai_reasoning_log` rows that were created — proving the end-to-end
 * filing workflow works against the live DB + LLM.
 *
 * Usage:
 *   npx tsx tools/scripts/voice/neha_gst_replay.ts
 *
 * NOTE: We must populate process.env.DATABASE_URL BEFORE importing
 * @zentrix/database (the pg pool reads it at module-eval time). So this
 * file uses a two-phase import: load env first, then dynamic-import the
 * modules that depend on the pool.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// ── Phase 1: Load env BEFORE any pool-touching imports ─────────────
config({ path: resolve(__dirname, '../../../apps/api/.env') });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in apps/api/.env — cannot connect.');
    process.exit(1);
}

// Disable Redis for this replay run — no local Redis server is running,
// and RedisMemory's constructor would otherwise retry-connect forever.
// RedisMemory checks REDIS_DISABLED and skips init() entirely, falling
// back to PostgreSQL for short-term memory.
process.env.REDIS_DISABLED = '1';
process.env.CRM_API_URL = 'http://localhost:4000';
console.log('✓ Redis disabled (REDIS_DISABLED=1) — memory will use PostgreSQL fallback');
console.log('✓ CRM_API_URL configured to http://localhost:4000');

// ── Phase 2: Dynamic imports (pool now sees DATABASE_URL) ─────────
// CognitiveInput is a plain object; we type loosely to avoid import-order issues.
type AccountantCognitiveInput = any;
let pool: any;
let nehaCognitiveLoop: any;

// ── Constants (from prior DB inspection) ────────────────────────────
// Maya Infratech tenant. tenants.id is UUID; CognitiveInput.tenant_id is
// typed `number` but the live WS process passes the UUID string at runtime.
const TENANT_ID = '1bbc00c0-766f-498d-9814-b9fdeb56b24d' as unknown as number;
const NEHA_PERSONA_ID = '93fc4ca4-a613-421e-90ed-56a8b4c868ac';
const CALLER_PHONE = '9876543210';
const CALLER_NAME = 'Ramesh Kumar';

// ── Scripted caller conversation (drives the GST-filing path) ──────
const SCRIPT: Array<{ text: string }> = [
    { text: 'Namaste, mera naam Ramesh Kumar hai. Mujhe apni company ka GSTR-1 file karna hai is mahine ke liye. Kya aap help kar sakti hain?' },
    { text: 'Haan, meri company ka GSTIN 27AAACR5055K1Z5 hai. Period July 2025 hai. Mujhe sales invoices aur purchase bills bhejne honge kya?' },
    { text: 'Theek hai, mere paas saari sales invoices hain. GSTR-1 ke liye kya-kya documents chahiye honge? Mujhe list de do.' },
    { text: 'Ok, main abhi sales register aur purchase register dono share kar deta hoon. Please filing start kar do aur agar koi issue ho to Surendra ji se connect kar dena.' },
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
    // Dynamic imports happen here (after env is loaded) so the pg pool
    // sees DATABASE_URL at module-eval time.
    const db = await import('@zentrix/database');
    pool = db.pool;
    const nehaModule = await import('../../../apps/digital-employee/src/agent/NehaAgent');
    nehaCognitiveLoop = nehaModule.default;

    banner('NEHA GST-FILING REPLAY — Live Cognitive Loop');
    console.log(`Tenant : ${TENANT_ID}`);
    console.log(`Persona: ${NEHA_PERSONA_ID} (Neha)`);
    console.log(`Caller : ${CALLER_NAME} (${CALLER_PHONE})`);
    console.log(`Script : ${SCRIPT.length} turns`);

    const reasoningPromises: Promise<any>[] = [];

    for (let i = 0; i < SCRIPT.length; i++) {
        const turn = SCRIPT[i];
        step(`Turn ${i + 1}/${SCRIPT.length} — Caller: "${turn.text.slice(0, 80)}${turn.text.length > 80 ? '…' : ''}"`);

        const input = {
            tenant_id: TENANT_ID,
            persona_id: NEHA_PERSONA_ID,
            channel: 'voice',
            user_message: turn.text,
            detected_language: 'hinglish',
            user_phone: CALLER_PHONE,
            caller_name: CALLER_NAME,
            is_first_turn: i === 0,
        } as AccountantCognitiveInput;

        const t0 = Date.now();
        const result = await nehaCognitiveLoop.processCycle(input);
        const trackAMs = Date.now() - t0;

        console.log(`  ├─ Track A response (${trackAMs}ms): "${result.fast_response.text.slice(0, 120)}${result.fast_response.text.length > 120 ? '…' : ''}"`);
        console.log(`  ├─ memory_id: ${result.memory_id}`);
        console.log(`  └─ turn_number: ${result.turn_number}`);

        // Track B reasoning is async — collect the promise so we can await
        // all of them after the conversation (filing task persists inside it).
        reasoningPromises.push(result.reasoning_promise);
    }

    step('Awaiting all Track B reasoning cycles (filing task + reasoning log persist here)…');
    const reasoningResults = await Promise.allSettled(reasoningPromises);

    reasoningResults.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            const reasoning = r.value;
            console.log(`  Turn ${i + 1} reasoning: action=${reasoning?.action || 'n/a'}, intent=${reasoning?.intent || 'n/a'}, emotion=${reasoning?.emotion || 'n/a'}`);
            if (reasoning?.filing) {
                console.log(`           ↳ FILING: type=${reasoning.filing.type}, gst_return_type=${reasoning.filing.gst_return_type || 'n/a'}, period=${reasoning.filing.period || 'n/a'}, status=${reasoning.filing.status}`);
            }
        } else {
            console.error(`  Turn ${i + 1} reasoning FAILED:`, r.reason?.message || r.reason);
        }
    });

    // ── Query the DB for created rows ───────────────────────────────
    await showFilingTasks();
    await showReasoningLog();

    banner('REPLAY COMPLETE');
    console.log('The ai_filing_tasks + ai_reasoning_log rows above were created by the live NehaCognitiveLoop.\n');

    step('Waiting for background simulated filing progress steps to complete...');
    await new Promise((resolve) => setTimeout(resolve, 40000));

    await pool.end();
    process.exit(0);
}

async function showFilingTasks() {
    banner('ai_filing_tasks — rows created by this replay');
    const { rows } = await pool.query(
        `SELECT id, filing_type, gst_return_type, period, status,
                required_documents, collected_documents, notes,
                created_at
         FROM ai_filing_tasks
         WHERE persona_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [NEHA_PERSONA_ID]
    );

    if (rows.length === 0) {
        console.log('  (no filing tasks found for Neha persona)');
        return;
    }

    rows.forEach((r: any, i: number) => {
        console.log(`\n  ── Filing Task #${i + 1} ─────────────────────────────`);
        console.log(`  id               : ${r.id}`);
        console.log(`  filing_type      : ${r.filing_type}`);
        console.log(`  gst_return_type  : ${r.gst_return_type || '—'}`);
        console.log(`  period           : ${r.period || '—'}`);
        console.log(`  status           : ${r.status}`);
        console.log(`  required_docs    : ${JSON.stringify(r.required_documents)}`);
        console.log(`  collected_docs   : ${JSON.stringify(r.collected_documents)}`);
        console.log(`  notes            : ${r.notes || '—'}`);
        console.log(`  created_at       : ${r.created_at}`);
    });
}

async function showReasoningLog() {
    banner('ai_reasoning_log — rows created by this replay');
    const { rows } = await pool.query(
        `SELECT turn_number, channel, user_input,
                reasoning_output->>'action'   AS action,
                reasoning_output->>'intent'   AS intent,
                reasoning_output->>'emotion'  AS emotion,
                reasoning_output->>'strategy' AS strategy,
                response_given,
                latency_ms, reasoning_ms,
                created_at
         FROM ai_reasoning_log
         WHERE persona_id = $1
         ORDER BY created_at DESC
         LIMIT 8`,
        [NEHA_PERSONA_ID]
    );

    if (rows.length === 0) {
        console.log('  (no reasoning log rows found for Neha persona)');
        return;
    }

    rows.forEach((r: any, i: number) => {
        console.log(`\n  ── Reasoning Log #${i + 1} (turn ${r.turn_number}) ────────────`);
        console.log(`  channel     : ${r.channel}`);
        console.log(`  user_input  : "${(r.user_input || '').slice(0, 100)}${(r.user_input || '').length > 100 ? '…' : ''}"`);
        console.log(`  action      : ${r.action || '—'}`);
        console.log(`  intent      : ${r.intent || '—'}`);
        console.log(`  emotion     : ${r.emotion || '—'}`);
        console.log(`  strategy    : ${r.strategy || '—'}`);
        console.log(`  response    : "${(r.response_given || '').slice(0, 100)}${(r.response_given || '').length > 100 ? '…' : ''}"`);
        console.log(`  latency_ms  : ${r.latency_ms ?? '—'}  reasoning_ms: ${r.reasoning_ms ?? '—'}`);
        console.log(`  created_at  : ${r.created_at}`);
    });
}

runReplay().catch((err) => {
    console.error('\n❌ Replay failed:', err);
    pool.end().finally(() => process.exit(1));
});
