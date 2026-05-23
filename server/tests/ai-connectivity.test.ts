import assert from 'assert';
import bcrypt from 'bcryptjs';
import pool from '../src/db/pool';

const BASE = process.env.API_URL || 'http://localhost:5051';
let TOKEN: string | null = null;
let TEMP_TENANT_ID: string | null = null;
let TEMP_USER_ID: string | null = null;

// ─── HTTP Request Helper ──────────────────────────────────────────
async function request(method: string, path: string, body: any = null, token: string | null = null) {
  const url = new URL(path, BASE).toString();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = { method, headers, redirect: 'follow' };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, body: data };
}

let passed = 0;
let failed = 0;

async function testStep(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

// ─── AI Connectivity Test Suite ───────────────────────────────────
async function run() {
  console.log(`\n🧪 ZentrixCRM Gemini AI Connectivity Test Suite`);
  console.log(`   Target API: ${BASE}\n`);

  // 1. Direct DB Setup
  await testStep('Direct DB Setup: Create temporary tenant & user', async () => {
    const pwHash = await bcrypt.hash('Admin@123', 10);
    
    // Create tenant
    const tenantRes = await pool.query(`
      INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, is_active)
      VALUES ('AI Test Tenant', 'ai-test-tenant', 'pro', 10, 1000, 10, TRUE)
      ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
      RETURNING id;
    `);
    TEMP_TENANT_ID = tenantRes.rows[0].id;
    assert.ok(TEMP_TENANT_ID, 'Failed to insert or get temporary tenant ID');

    // Create user
    const userRes = await pool.query(`
      INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
      VALUES ($1, 'AI Admin', 'ai-admin@zentrix.com', $2, 'admin', TRUE)
      ON CONFLICT (tenant_id, email) DO UPDATE SET is_active = TRUE, password_hash = EXCLUDED.password_hash
      RETURNING id;
    `, [TEMP_TENANT_ID, pwHash]);
    TEMP_USER_ID = userRes.rows[0].id;
    assert.ok(TEMP_USER_ID, 'Failed to insert temporary user ID');

    console.log(`     Tenant created: ${TEMP_TENANT_ID}`);
    console.log(`     User created: ${TEMP_USER_ID} (ai-admin@zentrix.com)`);
  });

  // 2. Authenticate
  await testStep('POST /api/auth/login - Authenticate E2E User', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'ai-admin@zentrix.com',
      password: 'Admin@123',
    });
    assert.strictEqual(res.status, 200, `Login failed: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.accessToken, 'Access token missing in response');
    TOKEN = res.body.accessToken;
    console.log(`     Authenticated successfully`);
  });

  if (!TOKEN) {
    console.error('❌ Authentication failed. Aborting remaining tests.');
    await cleanup();
    process.exit(1);
  }

  // 3. Test Daily Briefing (Default empty state check)
  await testStep('GET /api/ai/daily-briefing - Default Empty active leads briefing', async () => {
    const res = await request('GET', '/api/ai/daily-briefing', null, TOKEN);
    assert.strictEqual(res.status, 200, `Daily briefing failed: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.message, 'No active leads assigned to you yet.');
    console.log('     Briefing defaults gracefully when user has no leads');
  });

  // 4. Test Live Gemini Call (Generate Pitch)
  await testStep('POST /api/ai/generate-pitch - Live Gemini SDK connection & JSON parsing', async () => {
    console.log('     Calling Gemini API in the background. Please wait...');
    const start = Date.now();
    const res = await request('POST', '/api/ai/generate-pitch', {}, TOKEN);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    
    assert.strictEqual(res.status, 200, `AI Pitch generation failed: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.headline, 'AI response is missing "headline" key');
    assert.ok(res.body.hook, 'AI response is missing "hook" key');
    assert.ok(Array.isArray(res.body.value_propositions), 'AI response "value_propositions" is not an array');
    assert.ok(res.body.cta, 'AI response is missing "cta" key');

    console.log(`     Gemini Response received successfully in ${duration}s!`);
    console.log(`     Headline: "${res.body.headline}"`);
    console.log(`     Hook: "${res.body.hook}"`);
  });

  // 5. Teardown
  await cleanup();

  // ── Summary ──
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 AI Test Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

async function cleanup() {
  await testStep('Direct DB Teardown: Remove temporary user & tenant', async () => {
    if (TEMP_USER_ID) {
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [TEMP_USER_ID]);
      await pool.query('DELETE FROM users WHERE id = $1', [TEMP_USER_ID]);
    }
    if (TEMP_TENANT_ID) {
      await pool.query('DELETE FROM tenants WHERE id = $1', [TEMP_TENANT_ID]);
    }
    console.log('     Direct DB Teardown Completed successfully');
  });
}

run().catch(async (err) => {
  console.error('AI connectivity test runner crashed:', err);
  await cleanup();
  process.exit(1);
});
