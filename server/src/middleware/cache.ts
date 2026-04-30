import redis from '../db/redis';
import { Request, Response, NextFunction } from 'express';

/**
 * Express Middleware to cache API responses in Redis.
 * @param {number} durationSeconds - How long the data should live in the cache (TTL).
 * @param {function} customKeyGenerator - Optional function to generate custom cache keys.
 */
export const cacheResponse = (durationSeconds = 300, customKeyGenerator: ((req: any) => string) | null = null) => {
    return async (req: any, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate a unique key per tenant and per user role (or specific agent)
        let key = `cache:${req.originalUrl}`;
        
        if (customKeyGenerator) {
            key = customKeyGenerator(req);
        } else if (req.tenantId && req.user) {
             // Example: cache:/api/dashboard|tenantId:1|userId:10
             key = `cache:${req.originalUrl}|tenantId:${req.tenantId}|userId:${req.user.id}`;
        }

        try {
            const cachedData = await redis.get(key);
            
            if (cachedData) {
                console.log(`[CACHE HIT] Delivering fast response for ${req.originalUrl}`);
                return res.json(JSON.parse(cachedData));
            }

            console.log(`[CACHE MISS] Querying DB for ${req.originalUrl}`);

            // Intercept res.json to capture the DB response before it's sent to the client
            const originalJson = res.json.bind(res);
            res.json = ((body: any) => {
                // Save the DB response into Redis, then send it back to the client
                redis.setEx(key, durationSeconds, JSON.stringify(body));
                return originalJson(body);
            }) as any;

            next();
        } catch (error) {
            console.error('[CACHE MIDDLEWARE ERROR]', error);
            // If Redis fails mid-flight, bypass and continue normally
            next();
        }
    };
};

