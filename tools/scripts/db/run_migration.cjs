/**
 * One-off migration runner.
 *
 * Usage:
 *   node tools/scripts/db/run_migration.cjs <relative/path/to/migration.sql>
 *
 * Reads DATABASE_URL from apps/api/.env (or the environment) and executes the
 * given SQL file in a single transaction against the Supabase/Postgres pool.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ── Resolve the migration file path ──────────────────────────────────
const migrationArg = process.argv[2];
if (!migrationArg) {
    console.error('Usage: node tools/scripts/db/run_migration.cjs <migration.sql>');
    process.exit(1);
}

const migrationPath = path.isAbsolute(migrationArg)
    ? migrationArg
    : path.resolve(process.cwd(), migrationArg);

if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
}

// ── Load DATABASE_URL ────────────────────────────────────────────────
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    const envCandidates = [
        path.resolve(process.cwd(), 'apps/api/.env'),
        path.resolve(process.cwd(), '.env'),
    ];
    for (const envPath of envCandidates) {
        if (fs.existsSync(envPath)) {
            const raw = fs.readFileSync(envPath, 'utf8');
            const match = raw.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
            if (match) {
                databaseUrl = match[1].trim();
                console.log(`Loaded DATABASE_URL from ${envPath}`);
                break;
            }
        }
    }
}

if (!databaseUrl) {
    console.error('DATABASE_URL not found in environment or apps/api/.env');
    process.exit(1);
}

// ── Run the migration ────────────────────────────────────────────────
async function run() {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 15000,
    });

    const client = await pool.connect();
    try {
        console.log(`Connected. Executing migration: ${path.basename(migrationPath)}`);
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ Migration applied successfully.');
    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

run();
