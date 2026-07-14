import { createAdapter } from '@socket.io/redis-adapter';
import redis from '../db/redis';
import { logger } from './logger';

/**
 * setupSocketAdapter:
 * Configures Redis-based clustering for Socket.io events.
 * If Redis is offline or fails to connect within 3 seconds, it gracefully
 * falls back to Socket.io's default in-memory adapter.
 */
export async function setupSocketAdapter(io: any): Promise<void> {
    if (!redis.client || !redis.client.isReady) {
        logger.warn('[SOCKET ADAPTER] Redis client is not ready. Falling back to default in-memory adapter.');
        return;
    }

    try {
        const pubClient = redis.client.duplicate();
        const subClient = redis.client.duplicate();

        // Connect both clients, racing with a 3-second timeout to avoid locking startup
        await Promise.all([
            Promise.race([
                pubClient.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('PubClient connection timeout')), 3000))
            ]),
            Promise.race([
                subClient.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('SubClient connection timeout')), 3000))
            ])
        ]);

        // Apply the Redis adapter to Socket.io
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis Socket.io adapter clustered successfully');
    } catch (err: any) {
        logger.warn(`[SOCKET ADAPTER] Redis clustering failed (falling back to default in-memory adapter): ${err.message}`);
    }
}
