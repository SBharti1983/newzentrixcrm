import { createClient, RedisClientType } from 'redis';
import { logger } from '@zentrix/logger';
import { CircuitBreaker } from './CircuitBreaker';

export class RedisMemory {
    private client: RedisClientType | null = null;
    private connected = false;
    private breaker = new CircuitBreaker('redis', 5, 30_000);
    private url: string;

    constructor() {
        // Allow disabling Redis entirely (e.g. for local replays/tests
        // where no Redis server is running). When disabled, all operations
        // fall through to PostgreSQL via PostgresMemory.
        if (process.env.REDIS_DISABLED === '1' || process.env.REDIS_DISABLED === 'true') {
            this.url = '';
            this.connected = false;
            return;
        }
        this.url = process.env.REDIS_URL || 'redis://localhost:6379';
        this.init();
    }

    private async init(): Promise<void> {
        try {
            this.client = createClient({ url: this.url }) as RedisClientType;

            this.client.on('error', (err: Error) => {
                logger.warn(`[RedisMemory] Redis error: ${err.message}`);
                this.connected = false;
                this.breaker.recordFailure();
            });

            this.client.on('connect', () => {
                logger.info('[RedisMemory] Redis connected — short-term memory active');
                this.connected = true;
                this.breaker.recordSuccess();
            });

            this.client.on('disconnect', () => {
                logger.warn('[RedisMemory] Redis disconnected — falling back to PostgreSQL');
                this.connected = false;
            });

            await this.client.connect();
        } catch (err: any) {
            logger.warn(`[RedisMemory] Redis init failed: ${err.message}`);
            this.client = null;
            this.connected = false;
        }
    }

    get isConnected(): boolean {
        return this.connected;
    }

    get isBreakerOpen(): boolean {
        return this.breaker.isOpen;
    }

    async get(key: string): Promise<string | null> {
        if (this.connected && this.client && this.breaker.allow()) {
            try {
                const val = await this.client.get(key);
                this.breaker.recordSuccess();
                return val;
            } catch (err: any) {
                this.breaker.recordFailure();
                logger.warn(`[RedisMemory] Get failed for key ${key}: ${err.message}`);
                throw err;
            }
        }
        return null;
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        if (this.connected && this.client && this.breaker.allow()) {
            try {
                await this.client.set(key, value, { EX: ttlSeconds });
                this.breaker.recordSuccess();
            } catch (err: any) {
                this.breaker.recordFailure();
                logger.warn(`[RedisMemory] Set failed for key ${key}: ${err.message}`);
                throw err;
            }
        }
    }

    async del(key: string): Promise<void> {
        if (this.connected && this.client && this.breaker.allow()) {
            try {
                await this.client.del(key);
                this.breaker.recordSuccess();
            } catch (err: any) {
                this.breaker.recordFailure();
                logger.warn(`[RedisMemory] Del failed for key ${key}: ${err.message}`);
                throw err;
            }
        }
    }

    async shutdown(): Promise<void> {
        if (this.client && this.connected) {
            try {
                await this.client.disconnect();
                logger.info('[RedisMemory] Redis disconnected cleanly');
            } catch (err: any) {
                logger.warn(`[RedisMemory] Redis disconnect error: ${err.message}`);
            }
        }
    }
}
