const assert = require('assert');

const BASE = process.env.API_URL || 'http://localhost:5050';
let TOKEN = null;
let TEST_LEAD_ID = null;

// ─── Helpers ─────────────────────────────────────────────────────
async function request(method, path, body = null, token = null) {
  const url = new URL(path, BASE).toString();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers, redirect: 'follow' };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, body: data };
}

let passed = 0, failed = 0, skipped = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    if (err.message === 'SKIP') {
      skipped++;
      console.log(`  ⏭️  ${name} (skipped)`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
      console.log(`     ${err.message}`);
    }
  }
}

// ─── Test Suite ──────────────────────────────────────────────────
async function run() {
  console.log(`\n🧪 ZentrixCRM API Test Suite`);
  console.log(`   Target: ${BASE}\n`);

  // ── System ──
  console.log('📡 System');
  
  await test('GET / returns API info', async () => {
    const res = await request('GET', '/');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'ZentrixCRM API Running');
  });

  await test('GET /api/health returns ok', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.services.db, true);
  });

  await test('GET /api/docs returns Swagger UI', async () => {
    const res = await request('GET', '/api/docs.json');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.openapi);
  });

  await test('GET /nonexistent returns 404', async () => {
    const res = await request('GET', '/api/nonexistent-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'Route not found');
  });

  // ── Auth ──
  console.log('\n🔐 Authentication');

  await test('POST /api/auth/login with invalid creds returns 401', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'fake@nonexistent.com',
      password: 'wrongpassword'
    });
    assert.ok([400, 401, 403].includes(res.status), `Expected 4xx, got ${res.status}`);
  });

  await test('POST /api/auth/login with missing body returns error', async () => {
    const res = await request('POST', '/api/auth/login', {});
    assert.ok(res.status >= 400, `Expected error status, got ${res.status}`);
  });

  // ── Protected Routes (without token) ──
  console.log('\n🔒 Protected Routes (no token)');

  const protectedRoutes = [
    '/api/leads', '/api/dashboard', '/api/users',
    '/api/calls', '/api/analytics', '/api/notifications'
  ];

  for (const route of protectedRoutes) {
    await test(`GET ${route} without token returns 401/403`, async () => {
      const res = await request('GET', route);
      assert.ok([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
    });
  }

  // ── Rate Limiting ──
  console.log('\n⚡ Rate Limiting');

  await test('Rate limiter allows normal requests', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
  });

  // ── Summary ──
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`${'─'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
