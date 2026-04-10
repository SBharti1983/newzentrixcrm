/**
 * Diagnostic script to test the complete telephony recording pipeline.
 * Run: node server/test_telephony_pipeline.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db/pool');

async function diagnose() {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  ZENTRIX TELEPHONY PIPELINE DIAGNOSTIC');
    console.log('══════════════════════════════════════════════════════\n');

    // 1. Check environment variables
    console.log('─── 1. Environment Configuration ───');
    const checks = {
        'GEMINI_API_KEY': !!process.env.GEMINI_API_KEY,
        'FIREBASE_PROJECT_ID': !!process.env.FIREBASE_PROJECT_ID,
        'FIREBASE_CLIENT_EMAIL': !!process.env.FIREBASE_CLIENT_EMAIL,
        'FIREBASE_PRIVATE_KEY': !!process.env.FIREBASE_PRIVATE_KEY,
        'FIREBASE_STORAGE_BUCKET': process.env.FIREBASE_STORAGE_BUCKET || '(not set)',
        'ZAPIER_WEBHOOK_SECRET': !!process.env.ZAPIER_WEBHOOK_SECRET,
    };
    for (const [key, val] of Object.entries(checks)) {
        const status = val === true ? '✅' : (val === false ? '❌ MISSING' : `⚠️  ${val}`);
        console.log(`  ${key}: ${status}`);
    }

    // 2. Check Firebase Storage
    console.log('\n─── 2. Firebase Storage ───');
    try {
        const { bucket, isStorageEnabled } = require('./utils/firebase');
        if (isStorageEnabled) {
            console.log(`  ✅ Storage enabled. Bucket: ${bucket.name}`);
            // Verify bucket name looks correct
            if (bucket.name.includes('-default-rtdb')) {
                console.log(`  ⚠️  WARNING: Bucket name "${bucket.name}" contains "-default-rtdb".`);
                console.log(`     This is likely the RTDB bucket, not Storage.`);
                console.log(`     Expected format: "zentrix-wti.appspot.com" or "zentrix-wti.firebasestorage.app"`);
            }
        } else {
            console.log('  ❌ Storage NOT enabled. Recordings cannot be persisted to cloud.');
        }
    } catch (e) {
        console.log('  ❌ Firebase init error:', e.message);
    }

    // 3. Check AI Service
    console.log('\n─── 3. AI Transcription Service ───');
    try {
        const { isAiEnabled } = require('./utils/ai');
        console.log(`  ${isAiEnabled ? '✅' : '❌'} Gemini AI: ${isAiEnabled ? 'Enabled' : 'Disabled'}`);
    } catch (e) {
        console.log('  ❌ AI init error:', e.message);
    }

    // 4. Check database for recent call interactions
    console.log('\n─── 4. Recent Call Interactions ───');
    try {
        const result = await pool.query(`
            SELECT id, type, outcome, note, recording_url, transcript, sentiment, 
                   duration, created_at
            FROM interactions 
            WHERE type = 'Call'
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (result.rows.length === 0) {
            console.log('  ⚠️  No call interactions found in database.');
        } else {
            for (const row of result.rows) {
                const hasRec = row.recording_url ? '🎙️' : '❌';
                const hasTrans = row.transcript ? '📝' : '❌';
                const hasSent = row.sentiment ? '💭' : '❌';
                console.log(`  [${row.id}] ${row.outcome || 'N/A'} | Rec:${hasRec} Trans:${hasTrans} Sent:${hasSent} | ${row.created_at}`);
                if (row.note) {
                    const notePreview = row.note.substring(0, 80).replace(/\n/g, ' ');
                    console.log(`         Note: "${notePreview}${row.note.length > 80 ? '...' : ''}"`);
                }
                if (row.recording_url) {
                    console.log(`         Recording URL: ${row.recording_url}`);
                }
            }
        }
    } catch (e) {
        console.log('  ❌ Database query error:', e.message);
    }

    // 5. Check auth middleware compatibility
    console.log('\n─── 5. Auth Token Simulation ───');
    const secret = process.env.ZAPIER_WEBHOOK_SECRET;
    const testTenantId = '6f023c0a-a505-4ae4-962a-038a944d500e';
    const token = `${secret}:${testTenantId}`;
    console.log(`  Simulated X-Zapier-Token: ${token.substring(0, 30)}...`);
    
    // Verify tenant exists
    try {
        const tenantCheck = await pool.query('SELECT id, name FROM tenants WHERE id = $1', [testTenantId]);
        if (tenantCheck.rows.length > 0) {
            console.log(`  ✅ Tenant "${tenantCheck.rows[0].name}" exists in DB.`);
        } else {
            console.log(`  ❌ Tenant ID ${testTenantId} NOT FOUND in database!`);
            console.log('     The Android SyncWorker is sending a tenant ID that doesn\'t exist.');
            
            // Show available tenants
            const allTenants = await pool.query('SELECT id, name FROM tenants LIMIT 5');
            console.log('     Available tenants:');
            for (const t of allTenants.rows) {
                console.log(`       - ${t.id}: ${t.name}`);
            }
        }
    } catch (e) {
        console.log('  ❌ Tenant check error:', e.message);
    }

    // 6. Android WTI App config check
    console.log('\n─── 6. Android WTI Configuration Checklist ───');
    console.log('  The Android app MUST have these configured in Settings:');
    console.log('  □ Storage Server: Your backend URL (e.g., https://your-server.com or http://192.168.x.x:5050)');
    console.log('  □ Recording Toggle: ON');
    console.log('  □ Agent Name: Must match the Firebase agent ID used in the CRM');
    console.log('  □ RECORD_AUDIO permission: Granted in Android Settings');

    console.log('\n══════════════════════════════════════════════════════');
    console.log('  DIAGNOSTIC COMPLETE');
    console.log('══════════════════════════════════════════════════════\n');
    
    await pool.end();
}

diagnose().catch(e => { console.error('Diagnostic failed:', e); process.exit(1); });
