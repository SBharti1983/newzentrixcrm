import { Pool } from 'pg';
import * as Sentry from '@sentry/node';
import { logger } from '@zentrix/logger';

const isProduction = process.env.NODE_ENV === 'production';

// ── Query Logging Control ───────────────────────────────────────────
// Per-query logging + Sentry spans are expensive on the hot path.
// Only enable when explicitly requested via env to avoid taxing every query.
const DB_LOG_QUERIES = process.env.DB_LOG_QUERIES === 'true';
const DB_TRACE_QUERIES = process.env.DB_TRACE_QUERIES === 'true';
// Sample rate (0–1) for query logging when enabled, to cap overhead under load.
const DB_LOG_SAMPLE_RATE = Math.min(1, Math.max(0, parseFloat(process.env.DB_LOG_SAMPLE_RATE || '1')));

// ── Writer (Primary) Configuration ──────────────────────────────────
let writerUrl = process.env.DATABASE_URL;
let readerUrl = process.env.READ_REPLICA_URL || writerUrl; // Fallback to writer if no replica exists

const isSupabase = writerUrl && (writerUrl.includes('supabase.co') || writerUrl.includes('supabase.com'));
let sslConfig = process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : (process.env.DB_SSL === 'false'
        ? false
        : (isSupabase ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)));

// ── Supabase Optimization Helper ────────────────────────────────────
function optimizeConnectionString(urlStr: string, name: string) {
    if (urlStr && urlStr.includes('pooler.supabase.com') && urlStr.includes(':6543')) {
        return urlStr; // Already optimized, avoid URL object parsing which can distort custom protocols
    }
    if (urlStr && (urlStr.includes('supabase.co') || urlStr.includes('supabase.com'))) {
        try {
            const url = new URL(urlStr);

            // Auto-patch IPv4 pooler issue for Railway
            if (url.hostname === 'db.uvnkbewvpewocaqzysqb.supabase.co') {
                url.hostname = 'aws-1-ap-south-1.pooler.supabase.com';
                url.port = '6543';
                if (url.username === 'postgres') {
                    url.username = 'postgres.uvnkbewvpewocaqzysqb';
                }
            }

            // Use transaction pooler port 6543 instead of 5432 if supported
            if (url.port === '5432' && urlStr.includes('pooler.supabase.com')) {
                url.port = '6543';
            }
            return url.toString();
        } catch (e) {
            return urlStr;
        }
    }
    return urlStr;
}

const finalWriterUrl = optimizeConnectionString(writerUrl ?? '', 'Writer');
const finalReaderUrl = optimizeConnectionString(readerUrl ?? '', 'Reader');

// ── WRITER POOL (For INSERT/UPDATE/DELETE) ──────────────────────────
export const writerPool = new Pool({
    connectionString: finalWriterUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: sslConfig, // Dynamic SSL configuration
    allowExitOnIdle: true
});

writerPool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle writer client', err);
});

// ── READER POOL (For SELECT/Dashboards) ─────────────────────────────
export const readerPool = new Pool({
    connectionString: finalReaderUrl,
    max: isProduction ? 40 : 20, // Replicas handle more concurrency
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: sslConfig,
    allowExitOnIdle: true
});

readerPool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle reader client', err);
});

// ── Verification ────────────────────────────────────────────────────
writerPool.connect((err, client, release) => {
    if (err) logger.error(`❌ Writer Database connection failed: ${err.message}`);
    else {
        logger.info('✅ WRITER Database Connected (Master)');
        if (release) release();
    }
});

if (readerUrl !== writerUrl) {
    readerPool.connect((err, client, release) => {
        if (err) logger.error(`❌ Reader Replica connection failed: ${err.message}`);
        else {
            logger.info('✅ READER Replica Connected (Scale Mode)');
            if (release) release();
        }
    });
}

function isSelectStatement(sql: string): boolean {
    if (!sql) return false;
    const cleaned = sql.trim().replace(/^\/\*[\s\S]*?\*\//, '').trim();
    return cleaned.toUpperCase().startsWith('SELECT');
}

/**
 * SplitPool: Enterprise query router wrapper for Read/Write splitting.
 * Conforms to PgQueryable interface to be compatible with Drizzle-ORM.
 */
class SplitPool {
    public writer: Pool;
    public reader: Pool;

    constructor(writer: Pool, reader: Pool) {
        this.writer = writer;
        this.reader = reader;
    }

    /**
     * Intercept and route SQL queries.
     * Routes SELECT to read replica (readerPool) and other statements to primary (writerPool).
     *
     * Performance: per-query logging and Sentry spans are gated behind env flags
     * (DB_LOG_QUERIES / DB_TRACE_QUERIES) so the hot path stays cheap by default.
     */
    query(text: any, params?: any, callback?: any): any {
        let sqlText = '';
        if (typeof text === 'string') {
            sqlText = text;
        } else if (text && typeof text.text === 'string') {
            sqlText = text.text;
        }

        // Cheap read/write detection: scan for the first non-whitespace char and
        // check whether the statement starts with SELECT (case-insensitive). This
        // avoids the full trim()+regex() cleanup unless we actually need to log/trace.
        const isRead = isSelectStatement(sqlText);
        const targetPool = isRead ? this.reader : this.writer;

        // Only build the cleaned SQL string when we're going to use it.
        const wantLog = DB_LOG_QUERIES && Math.random() < DB_LOG_SAMPLE_RATE;
        const wantTrace = DB_TRACE_QUERIES && !!process.env.SENTRY_DSN;

        let cleanedSql = '';
        if (wantLog || wantTrace) {
            cleanedSql = sqlText.trim().replace(/^\/\*[\s\S]*?\*\//, '').trim();
            if (wantLog && cleanedSql) {
                logger.info(`[DB ROUTER] Routing to ${isRead ? 'READER' : 'WRITER'}: ${cleanedSql.substring(0, 120).replace(/\n/g, ' ')}...`);
            }
        }

        // --- SENTRY PERFORMANCE APM (opt-in) ---
        const activeSpan = wantTrace ? Sentry.getActiveSpan() : null;
        let dbSpan: any = null;

        if (activeSpan) {
            dbSpan = Sentry.startInactiveSpan({
                name: `db: ${cleanedSql.substring(0, 60)}`,
                op: 'db.query',
                attributes: {
                    'db.system': 'postgresql',
                    'db.statement': cleanedSql.substring(0, 500),
                    'db.operation': cleanedSql.split(' ')[0]?.toUpperCase() || 'QUERY',
                    'db.routing': isRead ? 'replica' : 'primary'
                }
            });
        }

        const startTime = (dbSpan || wantLog) ? Date.now() : 0;
        const queryPromise: any = targetPool.query(text, params, callback);

        // Measure query duration and complete the Sentry span
        if (queryPromise && typeof queryPromise.then === 'function') {
            queryPromise.then(() => {
                if (dbSpan) {
                    const duration = Date.now() - startTime;
                    dbSpan.setAttribute('db.duration_ms', duration);
                    dbSpan.end();
                }
            }).catch((err: any) => {
                if (dbSpan) {
                    dbSpan.setStatus({ code: 2, message: err.message }); // Set error status
                    dbSpan.end();
                }
            });
        }

        return queryPromise;
    }

    /**
     * Checkout a connection client.
     * Always returns from the writer pool to guarantee transactional integrity.
     */
    connect(callback?: any): any {
        return this.writer.connect(callback);
    }

    on(event: any, listener: (...args: any[]) => void) {
        this.writer.on(event, listener);
        this.reader.on(event, listener);
        return this;
    }

    end() {
        return Promise.all([this.writer.end(), this.reader.end()]);
    }
}

const splitPool = new SplitPool(writerPool, readerPool);

export default splitPool;
