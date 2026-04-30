import { Pool } from 'pg';
import config from '../config/secrets';

const isProduction = process.env.NODE_ENV === 'production';

// ── Writer (Primary) Configuration ──────────────────────────────────
let writerUrl = process.env.DATABASE_URL || config.database.connectionString;
let readerUrl = process.env.READ_REPLICA_URL || writerUrl; // Fallback to writer if no replica exists

let sslConfig = config.database.ssl;

// ── Supabase Optimization Helper ────────────────────────────────────
function optimizeConnectionString(urlStr: string, name: string) {
    if (urlStr && (urlStr.includes('supabase.co') || urlStr.includes('supabase.com'))) {
        if (isProduction) {
            try {
                const url = new URL(urlStr);
                // Use transaction pooler port 6543 instead of 5432 if supported
                if (url.port === '5432' && urlStr.includes('pooler.supabase.com')) {
                    url.port = '6543';
                }
                return url.toString();
            } catch (e) {
                return urlStr;
            }
        }
    }
    return urlStr;
}

const finalWriterUrl = optimizeConnectionString(writerUrl, 'Writer');
const finalReaderUrl = optimizeConnectionString(readerUrl, 'Reader');

// ── WRITER POOL (For INSERT/UPDATE/DELETE) ──────────────────────────
export const writerPool = new Pool({
    connectionString: finalWriterUrl,
    max: 20, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false }, // Force SSL for security
    allowExitOnIdle: true
});

// ── READER POOL (For SELECT/Dashboards) ─────────────────────────────
export const readerPool = new Pool({
    connectionString: finalReaderUrl,
    max: isProduction ? 40 : 20, // Replicas handle more concurrency
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
    allowExitOnIdle: true
});

// ── Verification ────────────────────────────────────────────────────
writerPool.connect((err) => {
    if (err) console.error('❌ Writer Database connection failed:', err.message);
    else console.log('✅ WRITER Database Connected (Master)');
});

if (readerUrl !== writerUrl) {
    readerPool.connect((err) => {
        if (err) console.error('❌ Reader Replica connection failed:', err.message);
        else console.log('✅ READER Replica Connected (Scale Mode)');
    });
}

/**
 * Enterprise Pattern: Export a combined object
 * This allows easy usage: pool.writer.query(...) or pool.reader.query(...)
 */
const pool = {
    writer: writerPool,
    reader: readerPool,
    // Legacy support for single pool calls
    query: (text: string, params?: any) => writerPool.query(text, params),
    connect: () => writerPool.connect()
};

export default pool;
