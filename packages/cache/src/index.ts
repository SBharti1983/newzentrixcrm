/**
 * @zentrix/cache — API Response Caching Middleware
 *
 * Express middleware that caches JSON responses in Redis.
 * Dashboard APIs like analytics and leaderboard get 10x faster
 * on repeated requests within the cache TTL.
 *
 * Usage:
 *   import { cacheMiddleware, invalidateCache } from '@zentrix/cache';
 *   app.get('/api/analytics', cacheMiddleware(60), analyticsHandler);
 */

import { logger } from '@zentrix/logger';
import redis from '@zentrix/database/src/redis';

interface CacheOptions {
    /** TTL in seconds (default: 60) */
    ttl?: number;
    /** Custom key generator (default: url + tenant_id) */
    keyFn?: (req: any) => string;
    /** Skip cache for certain requests */
    skipIf?: (req: any) => boolean;
}

/**
 * Default cache key: api:{url}:{tenant_id}
 */
function defaultKeyFn(req: any): string {
    const tenantId = req.user?.tenant_id || 'anon';
    return `api_cache:${tenantId}:${req.originalUrl}`;
}

/**
 * Express middleware for transparent Redis response caching.
 *
 * @param ttlOrOptions - TTL in seconds, or a full options object
 */
export function cacheMiddleware(ttlOrOptions: number | CacheOptions = 60) {
    const opts: CacheOptions = typeof ttlOrOptions === 'number'
        ? { ttl: ttlOrOptions }
        : ttlOrOptions;

    const ttl = opts.ttl || 60;
    const keyFn = opts.keyFn || defaultKeyFn;
    const skipIf = opts.skipIf;

    return async (req: any, res: any, next: any) => {
        // Skip non-GET requests (mutations should never be cached)
        if (req.method !== 'GET') return next();

        // Skip if condition met
        if (skipIf && skipIf(req)) return next();

        // Check Redis
        if (redis.client && redis.client.isReady) {
            const key = keyFn(req);
            try {
                const cached = await redis.get(key);
                if (cached) {
                    logger.info(`[Cache] HIT: ${key}`);
                    res.setHeader('X-Cache', 'HIT');
                    return res.json(JSON.parse(cached));
                }
            } catch (err: any) {
                logger.warn(`[Cache] Redis read failed: ${err.message}`);
            }

            // Cache MISS — intercept res.json to store the response
            const originalJson = res.json.bind(res);
            res.json = (data: any) => {
                // Store in Redis asynchronously (don't block response)
                try {
                    const serialized = JSON.stringify(data);
                    redis.set(key, ttl, serialized);
                    logger.info(`[Cache] MISS → stored: ${key} (TTL: ${ttl}s)`);
                } catch (err: any) {
                    logger.warn(`[Cache] Redis write failed: ${err.message}`);
                }

                res.setHeader('X-Cache', 'MISS');
                return originalJson(data);
            };
        }

        next();
    };
}

/**
 * Invalidate cached responses for a specific tenant.
 * Call this after mutations (POST/PUT/DELETE) that affect cached data.
 *
 * @param tenantId - The tenant whose cache should be cleared
 * @param pattern  - URL pattern to match (e.g., '/api/analytics*')
 */
export async function invalidateCache(tenantId: number | string, pattern?: string): Promise<void> {
    if (!redis.client || !redis.client.isReady) return;

    try {
        const keyPattern = pattern
            ? `api_cache:${tenantId}:${pattern}`
            : `api_cache:${tenantId}:*`;
        await redis.del(keyPattern);
        logger.info(`[Cache] Invalidated: ${keyPattern}`);
    } catch (err: any) {
        logger.warn(`[Cache] Invalidation failed: ${err.message}`);
    }
}

/**
 * Invalidate all cached responses (nuclear option — use sparingly).
 */
export async function invalidateAll(): Promise<void> {
    if (!redis.client || !redis.client.isReady) return;
    try {
        await redis.del('api_cache:*');
        logger.info('[Cache] All API caches invalidated');
    } catch (err: any) {
        logger.warn(`[Cache] Full invalidation failed: ${err.message}`);
    }
}
