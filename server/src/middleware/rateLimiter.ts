import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../db/redis';

// Check if local or production Redis is connected and ready
const isRedisReady = (): boolean => {
    return !!(redis.client && redis.client.isReady);
};

/**
 * HybridStore: Custom express-rate-limit Store.
 * Directs limit tracking to Redis if online, otherwise falls back gracefully
 * to an in-memory Map to protect the server from DDoS/Brute-force when Redis is offline.
 */
class HybridStore {
    private memoryStore: Map<string, { count: number; resetTime: number }>;
    private redisStore: any;
    private windowMs: number;

    constructor(options: { prefix: string; windowMs: number }) {
        this.memoryStore = new Map();
        this.windowMs = options.windowMs;
        
        this.redisStore = new RedisStore({
            sendCommand: async (...args: string[]) => {
                const flatArgs = args.flat();
                return redis.client.sendCommand(flatArgs);
            },
            prefix: options.prefix,
        });
    }

    async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
        if (isRedisReady()) {
            try {
                return await this.redisStore.increment(key);
            } catch (err: any) {
                console.warn(`[RATE LIMIT] Redis store increment failed (falling back to memory): ${err.message}`);
            }
        }

        // Memory fallback
        const now = Date.now();
        const record = this.memoryStore.get(key) || { count: 0, resetTime: now + this.windowMs };

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + this.windowMs;
        } else {
            record.count++;
        }

        this.memoryStore.set(key, record);

        return {
            totalHits: record.count,
            resetTime: new Date(record.resetTime),
        };
    }

    async decrement(key: string): Promise<void> {
        if (isRedisReady()) {
            try {
                return await this.redisStore.decrement(key);
            } catch (err) {
                // Ignore errors on decrement fallback
            }
        }

        const record = this.memoryStore.get(key);
        if (record && record.count > 0) {
            record.count--;
            this.memoryStore.set(key, record);
        }
    }

    async resetKey(key: string): Promise<void> {
        if (isRedisReady()) {
            try {
                return await this.redisStore.resetKey(key);
            } catch (err) {
                // Ignore errors on reset fallback
            }
        }
        this.memoryStore.delete(key);
    }
}

// Global API rate limiter: max 5000 requests per 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    store: new HybridStore({
        prefix: 'ratelimit:global:',
        windowMs: 15 * 60 * 1000
    }),
});

// Strict Auth rate limiter (Brute-force protection): max 5 attempts per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' },
    store: new HybridStore({
        prefix: 'ratelimit:auth:',
        windowMs: 15 * 60 * 1000
    }),
});
