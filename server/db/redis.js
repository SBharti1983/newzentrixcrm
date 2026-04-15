const { createClient } = require('redis');

// In production (Railway), REDIS_URL will be provided. In dev, it tries localhost.
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

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

/**
 * Safe execution wrapper. If Redis is down, it bypasses silently.
 */
const cacheDb = {
    async get(key) {
        if (!redisClient.isReady) return null;
        try {
            return await redisClient.get(key);
        } catch (e) {
            return null;
        }
    },
    async setEx(key, seconds, value) {
        if (!redisClient.isReady) return;
        try {
            await redisClient.setEx(key, seconds, value);
        } catch (e) {
            // ignore
        }
    },
    async del(keyPattern) {
        if (!redisClient.isReady) return;
        try {
            // For simple keys
            if (!keyPattern.includes('*')) {
                await redisClient.del(keyPattern);
                return;
            }
            // For wildcards (Note: in production using SCAN is better than KEYS)
            const keys = await redisClient.keys(keyPattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (e) {
            console.error('[REDIS DEL ERR]', e);
        }
    }
};

module.exports = { ...cacheDb, client: redisClient };
