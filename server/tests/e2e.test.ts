import assert from 'assert';
import bcrypt from 'bcryptjs';
import pool from '../src/db/pool';

const BASE = process.env.API_URL || 'http://localhost:5051';
const TEST_PHONE = '+91 99999 88888';
let TOKEN: string | null = null;
let TEST_LEAD_ID: string | null = null;
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

// ─── E2E Integration Suite ────────────────────────────────────────
async function run() {
  console.log(`\n🧪 ZentrixCRM E2E Self-Contained Test Suite`);
  console.log(`   Target API: ${BASE}\n`);

  // 1. Setup temporary tenant and user in database directly
  await testStep('Direct DB Setup: Create temporary tenant & user', async () => {
    const pwHash = await bcrypt.hash('Admin@123', 10);
    
    // Create tenant
    const tenantRes = await pool.query(`
      INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, is_active)
      VALUES ('E2E Test Tenant', 'e2e-test-tenant', 'pro', 10, 1000, 10, TRUE)
      ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
      RETURNING id;
    `);
    TEMP_TENANT_ID = tenantRes.rows[0].id;
    assert.ok(TEMP_TENANT_ID, 'Failed to insert or get temporary tenant ID');

    // Create user
    const userRes = await pool.query(`
      INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
      VALUES ($1, 'E2E Admin', 'e2e-admin@zentrix.com', $2, 'admin', TRUE)
      ON CONFLICT (tenant_id, email) DO UPDATE SET is_active = TRUE, password_hash = EXCLUDED.password_hash
      RETURNING id;
    `, [TEMP_TENANT_ID, pwHash]);
    TEMP_USER_ID = userRes.rows[0].id;
    assert.ok(TEMP_USER_ID, 'Failed to insert temporary user ID');

    console.log(`     Tenant created: ${TEMP_TENANT_ID}`);
    console.log(`     User created: ${TEMP_USER_ID} (e2e-admin@zentrix.com)`);
  });

  // 2. Authenticate using HTTP API
  await testStep('POST /api/auth/login as Temporary Admin', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'e2e-admin@zentrix.com',
      password: 'Admin@123',
    });
    assert.strictEqual(res.status, 200, `Login failed: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.accessToken, 'Access token missing in response');
    TOKEN = res.body.accessToken;
    console.log(`     Authenticated dynamically via API JWT`);
  });

  if (!TOKEN) {
    console.error('❌ Authentication failed. Aborting remaining tests.');
    await cleanup();
    process.exit(1);
  }

  // 3. Pre-test cleanup of leads (in case of legacy data)
  await testStep('Verify lead list is initially clean', async () => {
    const res = await request('GET', '/api/leads', null, TOKEN);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 0, 'Expected fresh tenant to have 0 leads');
  });

  // 4. Create a Lead
  await testStep('POST /api/leads - Create new lead', async () => {
    const leadPayload = {
      name: 'Test Lead E2E',
      phone: TEST_PHONE,
      email: 'test_e2e@zentrix.com',
      city: 'Mumbai',
      source: 'Website',
      stage: 'New',
      priority: 'High',
      budget: '₹75L',
      notes: 'Generated via automated E2E script',
    };

    const res = await request('POST', '/api/leads', leadPayload, TOKEN);
    assert.strictEqual(res.status, 201, `Lead creation failed: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.id, 'Lead ID not returned');
    TEST_LEAD_ID = res.body.id;
    assert.strictEqual(res.body.name, 'Test Lead E2E');
    assert.strictEqual(res.body.phone, TEST_PHONE);
    console.log(`     Created Lead successfully. Assigned ID: ${TEST_LEAD_ID}`);
  });

  // 5. Retrieve Lead Details
  await testStep('GET /api/leads/:id - Fetch lead details', async () => {
    assert.ok(TEST_LEAD_ID, 'No Lead ID available');
    const res = await request('GET', `/api/leads/${TEST_LEAD_ID}`, null, TOKEN);
    assert.strictEqual(res.status, 200, `Fetch lead details failed: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.id, TEST_LEAD_ID);
    assert.strictEqual(res.body.name, 'Test Lead E2E');
    assert.strictEqual(res.body.email, 'test_e2e@zentrix.com');
  });

  // 6. Shift Pipeline Stage (PATCH)
  await testStep('PATCH /api/leads/:id - Move lead stage to Contacted', async () => {
    assert.ok(TEST_LEAD_ID, 'No Lead ID available');
    const res = await request('PATCH', `/api/leads/${TEST_LEAD_ID}`, { stage: 'Contacted' }, TOKEN);
    assert.strictEqual(res.status, 200, `Stage update failed: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.stage, 'Contacted');
  });

  // 7. Verify Lead Stage is Updated in List
  await testStep('GET /api/leads - Search and verify lead details', async () => {
    const res = await request('GET', `/api/leads?q=${encodeURIComponent(TEST_PHONE)}`, null, TOKEN);
    assert.strictEqual(res.status, 200, `Search leads failed: ${JSON.stringify(res.body)}`);
    assert.ok(Array.isArray(res.body.data), 'Leads data is not an array');
    const match = res.body.data.find((l: any) => l.id === TEST_LEAD_ID);
    assert.ok(match, 'Test lead not found in search results');
    assert.strictEqual(match.stage, 'Contacted');
  });

  // 8. Cleanup & Delete Lead
  await testStep('DELETE /api/leads/:id - Clean up test lead', async () => {
    assert.ok(TEST_LEAD_ID, 'No Lead ID available');
    const res = await request('DELETE', `/api/leads/${TEST_LEAD_ID}`, null, TOKEN);
    assert.strictEqual(res.status, 200, `Delete lead failed: ${JSON.stringify(res.body)}`);
  });

  // 9. Confirm Lead is Deleted
  await testStep('GET /api/leads/:id - Confirm deletion (should be 404)', async () => {
    assert.ok(TEST_LEAD_ID, 'No Lead ID available');
    const res = await request('GET', `/api/leads/${TEST_LEAD_ID}`, null, TOKEN);
    assert.strictEqual(res.status, 404, `Expected 404 for deleted lead, got ${res.status}`);
  });

  // 10. Perform DB Teardown
  await cleanup();

  // ── Summary ──
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 E2E Results: ${passed} passed, ${failed} failed`);
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
  console.error('E2E test runner crashed:', err);
  await cleanup();
  process.exit(1);
});
