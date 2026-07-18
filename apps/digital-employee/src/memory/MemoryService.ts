import crypto from 'crypto';
import { RedisMemory } from './RedisMemory';
import { PostgresMemory } from './PostgresMemory';
import { VectorMemory } from './VectorMemory';
import { ConversationMemory, createDefaultConversationState } from './ConversationMemory';
import { CircuitBreaker } from './CircuitBreaker';
import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    RohanContext,
    ConversationState,
    ReasoningOutput,
    DbAIEmployeePersona,
    DbAIConversationMemory,
    ChannelType,
    MemoryTier,
    MemoryProvenance,
    MemoryDegradationMetrics
} from '@zentrix/types';

const SHORT_TTL_SECONDS = 3600;
const CONTEXT_TTL_SECONDS = 300;
const RAG_CACHE_TTL_SECONDS = 900;

function redisStateKey(tenantId: number, leadId: string): string {
    return `rohan:state:${tenantId}:${leadId}`;
}

function redisContextKey(tenantId: number, leadId: string): string {
    return `rohan:ctx:${tenantId}:${leadId}`;
}

function redisRagKey(tenantId: number, leadId: string, queryHash: string): string {
    return `rohan:rag:${tenantId}:${leadId}:${queryHash}`;
}

function hashQuery(query: string): string {
    let h = 5381;
    for (let i = 0; i < query.length; i++) {
        h = ((h << 5) + h) + query.charCodeAt(i);
        h = h & h;
    }
    return (h >>> 0).toString(36);
}

function sanitizeLeadId(leadId: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(leadId)) {
        return leadId;
    }
    const hash = crypto.createHash('md5').update(leadId).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

export class RohanMemory {
    private redisMemory = new RedisMemory();
    private postgresMemory = new PostgresMemory();
    private vectorMemory = new VectorMemory();
    private conversationMemory = new ConversationMemory();

    private metrics: MemoryDegradationMetrics = {
        redis_hits: 0,
        redis_misses: 0,
        redis_failures: 0,
        postgres_hits: 0,
        postgres_failures: 0,
        vector_hits: 0,
        vector_failures: 0,
        keyword_fallbacks: 0,
        redis_circuit_open_count: 0,
    };

    // Public getters to maintain backwards compatibility with tests that access breakers directly via casting
    get redisBreaker(): CircuitBreaker {
        return (this.redisMemory as any).breaker;
    }

    get vectorBreaker(): CircuitBreaker {
        return (this.vectorMemory as any).breaker;
    }

    async getConversationState(
        tenantId: number,
        leadId: string
    ): Promise<{ state: ConversationState | null; provenance: MemoryProvenance }> {
        const sanitizedLeadId = sanitizeLeadId(leadId);
        const degraded: MemoryTier[] = [];
        const start = Date.now();

        if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen) {
            try {
                const raw = await this.redisMemory.get(redisStateKey(tenantId, sanitizedLeadId));
                if (raw) {
                    this.metrics.redis_hits++;
                    return {
                        state: JSON.parse(raw) as ConversationState,
                        provenance: {
                            served_by: MemoryTier.REDIS,
                            degraded_tiers: [],
                            latency_ms: Date.now() - start,
                            cache_hit: true,
                        },
                    };
                }
                this.metrics.redis_misses++;
                degraded.push(MemoryTier.REDIS);
            } catch (err: any) {
                this.metrics.redis_failures++;
                degraded.push(MemoryTier.REDIS);
                logger.warn(`[MemoryService] Redis get failed, falling back to PG: ${err.message}`);
            }
        } else {
            degraded.push(MemoryTier.REDIS);
            if (this.redisMemory.isBreakerOpen) {
                this.metrics.redis_circuit_open_count++;
            }
        }

        const state = await this.postgresMemory.loadStateFromPG(tenantId, sanitizedLeadId);
        if (state) {
            this.metrics.postgres_hits++;
        } else {
            this.metrics.postgres_failures++;
        }

        return {
            state,
            provenance: {
                served_by: MemoryTier.POSTGRES,
                degraded_tiers: degraded,
                latency_ms: Date.now() - start,
                cache_hit: false,
            },
        };
    }

    async saveConversationState(
        tenantId: number,
        leadId: string,
        state: ConversationState,
        memoryId?: string
    ): Promise<void> {
        const sanitizedLeadId = sanitizeLeadId(leadId);
        if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen) {
            try {
                await this.redisMemory.set(
                    redisStateKey(tenantId, sanitizedLeadId),
                    JSON.stringify(state),
                    SHORT_TTL_SECONDS
                );
            } catch (err: any) {
                this.metrics.redis_failures++;
                logger.warn(`[MemoryService] Redis set failed: ${err.message}`);
            }
        }

        try {
            await this.postgresMemory.persistStateToPG(tenantId, sanitizedLeadId, state, memoryId);
        } catch (err: any) {
            this.metrics.postgres_failures++;
        }
    }

    async getOrCreateMemory(
        tenantId: number,
        personaId: string,
        leadId: string,
        channel: ChannelType
    ): Promise<DbAIConversationMemory> {
        const sanitizedLeadId = sanitizeLeadId(leadId);
        try {
            const memory = await this.conversationMemory.getOrCreateMemory(tenantId, personaId, sanitizedLeadId, channel);
            this.metrics.postgres_hits++;
            return memory;
        } catch (err: any) {
            this.metrics.postgres_failures++;
            throw err;
        }
    }

    async saveReasoning(memoryId: string, reasoning: ReasoningOutput): Promise<void> {
        await this.conversationMemory.saveReasoning(memoryId, reasoning);
    }

    async logReasoning(
        tenantId: number,
        personaId: string,
        leadId: string | undefined,
        memoryId: string | undefined,
        turnNumber: number,
        channel: ChannelType,
        userInput: string,
        reasoning: ReasoningOutput,
        responseGiven: string,
        latencyMs: number,
        reasoningMs: number
    ): Promise<void> {
        const sanitizedLeadId = leadId ? sanitizeLeadId(leadId) : undefined;
        await this.conversationMemory.logReasoning(
            tenantId, personaId, sanitizedLeadId, memoryId, turnNumber,
            channel, userInput, reasoning, responseGiven,
            latencyMs, reasoningMs
        );

        if (sanitizedLeadId && this.vectorMemory.isReady && !this.vectorMemory.isBreakerOpen) {
            const content = `User: ${userInput}\nRohan: ${responseGiven}`;
            this.vectorMemory.storeTurn(
                tenantId,
                sanitizedLeadId,
                personaId,
                channel,
                turnNumber,
                content,
                { memoryId, intent: reasoning.intent, emotion: reasoning.emotion }
            )
            .then(() => {
                this.metrics.vector_hits++;
            })
            .catch((err: any) => {
                this.metrics.vector_failures++;
                logger.warn(`[MemoryService] pgvector turn save failed: ${err.message}`);
            });
        }
    }

    async loadContext(
        tenantId: number,
        persona: DbAIEmployeePersona,
        leadId: string,
        channel: ChannelType,
        userQuery?: string
    ): Promise<RohanContext> {
        const sanitizedLeadId = sanitizeLeadId(leadId);
        let context: RohanContext;
        let cachedContext: RohanContext | null = null;

        if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen) {
            try {
                const cached = await this.redisMemory.get(redisContextKey(tenantId, sanitizedLeadId));
                if (cached) {
                    logger.info(`[MemoryService] Context cache hit for lead ${sanitizedLeadId}`);
                    cachedContext = JSON.parse(cached) as RohanContext;
                    this.metrics.redis_hits++;
                } else {
                    this.metrics.redis_misses++;
                }
            } catch (err: any) {
                this.metrics.redis_failures++;
                logger.warn(`[MemoryService] Context cache read failed: ${err.message}`);
            }
        }

        if (cachedContext) {
            context = cachedContext;
        } else {
            logger.info(`[MemoryService] Assembling context for lead ${sanitizedLeadId} from PostgreSQL`);
            const [leadResult, projectResult, interactionsResult, memoryResult] = await Promise.all([
                this.postgresMemory.loadLead(tenantId, sanitizedLeadId),
                this.postgresMemory.loadProjectForLead(tenantId, sanitizedLeadId),
                this.postgresMemory.loadRecentInteractions(tenantId, sanitizedLeadId, 10),
                this.getOrCreateMemory(tenantId, persona.id, sanitizedLeadId, channel),
            ]);

            let battleCardResult: any = null;
            if (projectResult && projectResult.name) {
                battleCardResult = await this.postgresMemory.loadProjectBattleCard(tenantId, projectResult.name);
            }

            context = {
                persona,
                lead: leadResult || undefined,
                project: projectResult || undefined,
                recent_interactions: interactionsResult,
                conversation_state: memoryResult.conversation_state,
                last_reasoning: memoryResult.last_reasoning,
                semantic_memories: [],
                battle_card: battleCardResult || undefined,
            };

            logger.info(`[MemoryService] Loaded leadResult=${JSON.stringify(leadResult)} projectResult=${JSON.stringify(projectResult)} battleCardResult=${JSON.stringify(battleCardResult)}`);

            if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen) {
                try {
                    await this.redisMemory.set(
                        redisContextKey(tenantId, sanitizedLeadId),
                        JSON.stringify(context),
                        CONTEXT_TTL_SECONDS
                      );
                } catch (err: any) {
                    this.metrics.redis_failures++;
                    logger.warn(`[MemoryService] Context cache write failed: ${err.message}`);
                }
            }
        }

        context.semantic_memories = await this.loadSemanticMemories(tenantId, sanitizedLeadId, userQuery);
        return context;
    }

    private async loadSemanticMemories(
        tenantId: number,
        leadId: string,
        userQuery?: string
    ): Promise<NonNullable<RohanContext['semantic_memories']>> {
        const sanitizedLeadId = sanitizeLeadId(leadId);
        if (!userQuery) return [];

        const queryHash = hashQuery(userQuery);

        if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen) {
            try {
                const cached = await this.redisMemory.get(redisRagKey(tenantId, sanitizedLeadId, queryHash));
                if (cached) {
                    this.metrics.redis_hits++;
                    return JSON.parse(cached) as NonNullable<RohanContext['semantic_memories']>;
                }
            } catch (err: any) {
                this.metrics.redis_failures++;
                logger.warn(`[MemoryService] RAG cache read failed: ${err.message}`);
            }
        }

        let results: NonNullable<RohanContext['semantic_memories']> = [];
        if (this.vectorMemory.isReady && !this.vectorMemory.isBreakerOpen) {
            try {
                results = await this.vectorMemory.retrieveSimilar(tenantId, userQuery, sanitizedLeadId);
                this.metrics.vector_hits++;
            } catch (err: any) {
                this.metrics.vector_failures++;
                logger.warn(`[MemoryService] Vector memory RAG lookup failed: ${err.message}`);
            }
        }

        if (results.length === 0) {
            const fallback = await this.keywordFallback(tenantId, sanitizedLeadId, userQuery);
            if (fallback.length > 0) {
                this.metrics.keyword_fallbacks++;
                results = fallback;
            }
        }

        if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen && results.length > 0) {
            try {
                await this.redisMemory.set(
                    redisRagKey(tenantId, sanitizedLeadId, queryHash),
                    JSON.stringify(results),
                    RAG_CACHE_TTL_SECONDS
                );
            } catch (err: any) {
                logger.warn(`[MemoryService] RAG cache write failed: ${err.message}`);
            }
        }

        return results;
    }

    private async keywordFallback(
        tenantId: number,
        leadId: string,
        query: string
    ): Promise<NonNullable<RohanContext['semantic_memories']>> {
        const sanitizedLeadId = sanitizeLeadId(leadId);
        try {
            const tokens = query
                  .toLowerCase()
                  .split(/\s+/)
                  .filter(t => t.length >= 3)
                  .slice(0, 3);
            if (tokens.length === 0) return [];

            const orClauses = tokens.map((_, i) => `note ILIKE $${i + 3}`).join(' OR ');
            const { rows } = await pool.query(
                `SELECT id, note, type, created_at
                 FROM interactions
                 WHERE tenant_id = $1 AND lead_id = $2 AND (${orClauses})
                 ORDER BY created_at DESC
                 LIMIT 3`,
                [tenantId, sanitizedLeadId, ...tokens.map(t => `%${t}%`)]
            );

            return rows.map((r: any) => ({
                content: `[keyword match] ${r.note}`,
                score: 0.4,
                metadata: { source: 'keyword-fallback', type: r.type, interaction_id: r.id },
            }));
        } catch (err: any) {
            logger.warn(`[MemoryService] Keyword fallback failed: ${err.message}`);
            return [];
        }
    }

    async invalidateContextCache(tenantId: number, leadId: string): Promise<void> {
        if (this.redisMemory.isConnected && !this.redisMemory.isBreakerOpen) {
            try {
                await this.redisMemory.del(redisContextKey(tenantId, leadId));
            } catch (err: any) {
                this.metrics.redis_failures++;
                logger.warn(`[MemoryService] Context cache invalidation failed: ${err.message}`);
            }
        }
    }

    getHealthStatus(): {
        redis: boolean;
        tier: string;
        vectorStore: boolean;
        redisCircuitOpen: boolean;
        vectorCircuitOpen: boolean;
        metrics: MemoryDegradationMetrics;
    } {
        return {
            redis: this.redisMemory.isConnected,
            tier: this.redisMemory.isConnected ? 'redis+pg+vector' : 'pg+vector',
            vectorStore: this.vectorMemory.isReady,
            redisCircuitOpen: this.redisMemory.isBreakerOpen,
            vectorCircuitOpen: this.vectorMemory.isBreakerOpen,
            metrics: { ...this.metrics },
        };
    }

    async shutdown(): Promise<void> {
        await this.redisMemory.shutdown();
    }
}

const rohanMemory = new RohanMemory();
export default rohanMemory;
export { createDefaultConversationState, CircuitBreaker };
