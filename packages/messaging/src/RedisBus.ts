/**
 * Redis-backed cross-process Event Bus implementation
 */

import { createClient, RedisClientType } from 'redis';
import { EventMap } from '@zentrix/events';
import { logger } from '@zentrix/logger';

export class RedisBus {
    private pubClient: RedisClientType;
    private subClient: RedisClientType;
    private isConnected = false;
    private handlersMap = new Map<string, Set<(payload: any) => void>>();

    constructor(redisUrl?: string) {
        const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
        this.pubClient = createClient({ url });
        this.subClient = createClient({ url });

        this.pubClient.on('error', (err) => logger.error(`[RedisBus Pub] error: ${err.message}`));
        this.subClient.on('error', (err) => logger.error(`[RedisBus Sub] error: ${err.message}`));
    }

    /**
     * Connect pub/sub clients to Redis server
     */
    async connect(): Promise<void> {
        if (this.isConnected) return;
        try {
            await Promise.all([
                this.pubClient.connect(),
                this.subClient.connect()
            ]);
            this.isConnected = true;
            logger.info('[RedisBus] Connected successfully to Redis cross-process event broker');
        } catch (err: any) {
            logger.warn(`[RedisBus] Connection failed: ${err.message}. Event dispatches will default to mock loops.`);
        }
    }

    /**
     * Publish event to Redis channel
     */
    async publish<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
        if (!this.isConnected) {
            logger.warn(`[RedisBus] Offline: Skipping event publish for topic "${event}"`);
            return;
        }
        await this.pubClient.publish(event, JSON.stringify(payload));
    }

    /**
     * Subscribe to Redis channel topic
     */
    async subscribe<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): Promise<void> {
        let handlers = this.handlersMap.get(event);
        if (!handlers) {
            handlers = new Set();
            this.handlersMap.set(event, handlers);

            if (this.isConnected) {
                await this.subClient.subscribe(event, (message) => {
                    try {
                        const parsed = JSON.parse(message);
                        const activeHandlers = this.handlersMap.get(event);
                        if (activeHandlers) {
                            for (const h of activeHandlers) {
                                h(parsed);
                            }
                        }
                    } catch (err: any) {
                        logger.error(`[RedisBus] Failed to parse message on topic "${event}": ${err.message}`);
                    }
                });
            }
        }
        handlers.add(handler);
    }

    /**
     * Disconnect pub/sub clients
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await Promise.all([
            this.pubClient.disconnect(),
            this.subClient.disconnect()
        ]);
        this.isConnected = false;
    }
}
