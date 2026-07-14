import { Pool } from 'pg';
import * as Sentry from '@sentry/node';
import { logger } from '@zentrix/logger';

const isProduction = process.env.NODE_ENV === 'production';

// ── Writer (Primary) Configuration ──────────────────────────────────
let writerUrl = process.env.DATABASE_URL;
let readerUrl = process.env.READ_REPLICA_URL || writerUrl; // Fallback to writer if no replica exists

const isSupabase = writerUrl && (writerUrl.includes('supabase.co') || writerUrl.includes('supabase.com'));
let sslConfig = isSupabase ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);

// ── Supabase Optimization Helper ────────────────────────────────────
function optimizeConnectionString(urlStr: string, name: string) {
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

writerPool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle writer client', err);
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

readerPool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle reader client', err);
});

// ── Verification ────────────────────────────────────────────────────
writerPool.connect((err) => {
    if (err) logger.error(`❌ Writer Database connection failed: ${err.message}`);
    else logger.info('✅ WRITER Database Connected (Master)');
});

if (readerUrl !== writerUrl) {
    readerPool.connect((err) => {
        if (err) logger.error(`❌ Reader Replica connection failed: ${err.message}`);
        else logger.info('✅ READER Replica Connected (Scale Mode)');
    });
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
     */
    query(text: any, params?: any, callback?: any): any {
        let sqlText = '';
        if (typeof text === 'string') {
            sqlText = text;
        } else if (text && typeof text.text === 'string') {
            sqlText = text.text;
        }

        // Clean query text by trimming leading whitespace and removing inline/block comments
        const cleanedSql = sqlText.trim().replace(/^\/\*[\s\S]*?\*\//, '').trim();
        const isRead = cleanedSql.toUpperCase().startsWith('SELECT');

        const targetPool = isRead ? this.reader : this.writer;
        
        if (cleanedSql) {
            logger.info(`[DB ROUTER] Routing to ${isRead ? 'READER' : 'WRITER'}: ${cleanedSql.substring(0, 120).replace(/\n/g, ' ')}...`);
        }

        // --- SENTRY PERFORMANCE APM ---
        const activeSpan = Sentry.getActiveSpan();
        let dbSpan: any = null;
        
        if (activeSpan && process.env.SENTRY_DSN) {
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

        const startTime = Date.now();
        const queryPromise: any = targetPool.query(text, params, callback);

        // Measure query duration and complete the Sentry span
        if (queryPromise && typeof queryPromise.then === 'function') {
            queryPromise.then(() => {
                const duration = Date.now() - startTime;
                if (dbSpan) {
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
