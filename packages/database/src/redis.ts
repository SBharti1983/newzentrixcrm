import { createClient } from 'redis';

// In production (Railway), REDIS_URL will be provided. In dev, it tries localhost.
// Fallback to internal Railway hostname if REDIS_URL is missing but we're on Railway.
const redisUrl = process.env.REDIS_URL ||
    (process.env.RAILWAY_STATIC_URL ? 'redis://redis.railway.internal:6379' : 'redis://localhost:6379');

const redisClient = createClient({
    url: redisUrl,
    socket: {
        connectTimeout: 10000, // 10s timeout
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.warn(`[REDIS] Failed to connect to ${redisUrl} after 10 attempts. Disabling cache.`);
                return new Error('Redis connection exhausted');
            }
            const delay = Math.min(retries * 100, 3000);
            return delay;
        }
    }
});

redisClient.on('error', (err) => {
    // Only log once to prevent console spam if redis isn't running locally
    if (err.code !== 'ECONNREFUSED') {
        console.error('[REDIS ERROR]:', err.message);
    }
});

redisClient.on('connect', () => {
    console.log('✅ Connected to Redis cache successfully');
});

// Immediately invoke connection in the background
redisClient.connect().catch((err) => {
    console.warn(`[REDIS] Local server not running. Bypass mode active.`);
});

// Helper to wrap promise with a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    const timeout: Promise<never> = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), ms)
    );
    return Promise.race([promise, timeout]);
};

/**
 * Safe execution wrapper. If Redis is down, it bypasses silently.
 */
const cacheDb = {
    async get(key: string) {
        if (!redisClient.isReady) return null;
        try {
            return await withTimeout(redisClient.get(key), 2000);
        } catch (e) {
            return null;
        }
    },
    async setEx(key: string, seconds: number, value: string) {
        if (!redisClient.isReady) return;
        try {
            await withTimeout(redisClient.setEx(key, seconds, value), 2000);
        } catch (e) {
            // ignore
        }
    },
    async del(keyPattern: string) {
        if (!redisClient.isReady) return;

        try {
            // For simple keys
            if (!keyPattern.includes('*')) {
                await withTimeout(redisClient.del(keyPattern), 2000);
                return;
            }
            // For wildcards (Note: in production using SCAN is better than KEYS)
            const keys = await withTimeout(redisClient.keys(keyPattern), 2000);
            if (keys && keys.length > 0) {
                // Batch delete
                await withTimeout(redisClient.del(keys), 2000);
            }
        } catch (e: any) {
            console.warn('[REDIS DEL ERR]', e.message);
        }
    }
};

export default { ...cacheDb, client: redisClient };
