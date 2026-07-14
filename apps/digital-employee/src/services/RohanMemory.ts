/**
 * RohanMemory — Three-Tier Memory Layer
 *
 * Tier 1: Short-term (Redis)     — live conversation state, sub-ms access
 * Tier 2: Working (PostgreSQL)   — lead profile, interaction history, conversation_state
 * Tier 3: Long-term (Vector DB) — semantic search of past conversations (future)
 *
 * Design principle: Redis is an optimization layer. If Redis is down,
 * the system degrades gracefully to PostgreSQL-only (slower but functional).
 * No conversation should fail because Redis is unavailable.
 *
 * NOTE: This module runs inside apps/digital-employee — isolated from CRM API traffic.
 */

import { createClient, RedisClientType } from 'redis';
import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    RohanContext,
    ConversationState,
    ReasoningOutput,
    DbAIEmployeePersona,
    DbAIConversationMemory,
    ChannelType,
    SupportedLanguage,
    MemoryLoadError,
} from '@zentrix/types';

// ── Redis Key Helpers ───────────────────────────────────────────────
const REDIS_KEY_PREFIX = 'rohan';
const SHORT_TTL_SECONDS = 3600; // 1 hour for active conversation state
const CONTEXT_TTL_SECONDS = 300; // 5 min cache for loaded context

function redisStateKey(tenantId: number, leadId: string): string {
    return `${REDIS_KEY_PREFIX}:state:${tenantId}:${leadId}`;
}

function redisContextKey(tenantId: number, leadId: string): string {
    return `${REDIS_KEY_PREFIX}:ctx:${tenantId}:${leadId}`;
}

// ── Default Conversation State ─────────────────────────────────────
function createDefaultConversationState(channel: ChannelType): ConversationState {
    return {
        turn_count: 0,
        language_detected: 'unknown',
        emotion_trend: [],
        current_goal: 'qualify_and_engage',
        missing_info: ['budget', 'timeline', 'property_preference'],
        objections_raised: [],
        documents_shared: [],
        next_action: 'greet_and_qualify',
        conversation_started_at: new Date().toISOString(),
    };
}

class RohanMemory {
    private redis: RedisClientType | null = null;
    private redisConnected = false;
    private redisUrl: string;

    constructor() {
        this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.initRedis();
    }

    // ── Redis Initialization (lazy, non-blocking) ───────────────────
    private async initRedis(): Promise<void> {
        try {
            this.redis = createClient({ url: this.redisUrl }) as RedisClientType;

            this.redis.on('error', (err: Error) => {
                logger.warn(`[RohanMemory] Redis error (degrading to PG-only): ${err.message}`);
                this.redisConnected = false;
            });

            this.redis.on('connect', () => {
                logger.info('[RohanMemory] Redis connected — short-term memory active');
                this.redisConnected = true;
            });

            this.redis.on('disconnect', () => {
                logger.warn('[RohanMemory] Redis disconnected — falling back to PostgreSQL');
                this.redisConnected = false;
            });

            await this.redis.connect();
        } catch (err: any) {
            logger.warn(`[RohanMemory] Redis init failed (non-fatal): ${err.message}`);
            this.redis = null;
            this.redisConnected = false;
        }
    }

    // ── Tier 1: Short-term Memory (Redis) ──────────────────────────

    /**
     * Get the live conversation state from Redis.
     * Falls back to PostgreSQL if Redis is unavailable.
     */
    async getConversationState(
        tenantId: number,
        leadId: string
    ): Promise<ConversationState | null> {
        // Try Redis first (sub-ms)
        if (this.redisConnected && this.redis) {
            try {
                const raw = await this.redis.get(redisStateKey(tenantId, leadId));
                if (raw && typeof raw === 'string') {
                    return JSON.parse(raw) as ConversationState;
                }
            } catch (err: any) {
                logger.warn(`[RohanMemory] Redis get failed, falling back to PG: ${err.message}`);
            }
        }

        // Fallback: load from PostgreSQL working memory
        return this.loadStateFromPG(tenantId, leadId);
    }

    /**
     * Save conversation state to Redis (and mirror to PG for persistence).
     */
    async saveConversationState(
        tenantId: number,
        leadId: string,
        state: ConversationState,
        memoryId?: string
    ): Promise<void> {
        // Write to Redis (fast, ephemeral)
        if (this.redisConnected && this.redis) {
            try {
                await this.redis.set(
                    redisStateKey(tenantId, leadId),
                    JSON.stringify(state),
                    { EX: SHORT_TTL_SECONDS }
                );
            } catch (err: any) {
                logger.warn(`[RohanMemory] Redis set failed: ${err.message}`);
            }
        }

        // Mirror to PostgreSQL (durable)
        await this.persistStateToPG(tenantId, leadId, state, memoryId);
    }

    // ── Tier 2: Working Memory (PostgreSQL) ────────────────────────

    /**
     * Load or create a conversation memory record for a lead.
     */
    async getOrCreateMemory(
        tenantId: number,
        personaId: string,
        leadId: string,
        channel: ChannelType
    ): Promise<DbAIConversationMemory> {
        // Try to find existing memory
        const { rows } = await pool.query(
            `SELECT * FROM ai_conversation_memory
             WHERE tenant_id = $1 AND lead_id = $2
             ORDER BY updated_at DESC LIMIT 1`,
            [tenantId, leadId]
        );

        if (rows.length > 0) {
            return rows[0] as DbAIConversationMemory;
        }

        // Create new memory record
        const initialState = createDefaultConversationState(channel);
        const expiresAt = new Date(Date.now() + SHORT_TTL_SECONDS * 1000);

        const insertResult = await pool.query(
            `INSERT INTO ai_conversation_memory
                (tenant_id, persona_id, lead_id, channel, conversation_state, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [tenantId, personaId, leadId, channel, initialState, expiresAt]
        );

        return insertResult.rows[0] as DbAIConversationMemory;
    }

    /**
     * Persist Track B's reasoning output to memory.
     * This is what makes Rohan "remember" his reasoning across turns.
     */
    async saveReasoning(
        memoryId: string,
        reasoning: ReasoningOutput
    ): Promise<void> {
        await pool.query(
            `UPDATE ai_conversation_memory
             SET last_reasoning = $1,
                 last_reasoning_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [reasoning, memoryId]
        );
    }

    /**
     * Log a reasoning cycle to the audit trail.
     */
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
        try {
            await pool.query(
                `INSERT INTO ai_reasoning_log
                    (tenant_id, persona_id, lead_id, memory_id, turn_number,
                     channel, user_input, reasoning_output, response_given,
                     latency_ms, reasoning_ms)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    tenantId, personaId, leadId, memoryId, turnNumber,
                    channel, userInput, reasoning, responseGiven,
                    latencyMs, reasoningMs
                ]
            );
        } catch (err: any) {
            logger.warn(`[RohanMemory] Failed to log reasoning: ${err.message}`);
        }
    }

    // ── Context Assembly ────────────────────────────────────────────

    /**
     * Assemble the full context bundle Rohan needs before responding.
     * This is called at the start of every cognitive cycle.
     *
     * Performance: Uses Redis cache for the assembled context (5 min TTL)
     * to avoid repeated DB queries during rapid back-and-forth.
     */
    async loadContext(
        tenantId: number,
        persona: DbAIEmployeePersona,
        leadId: string,
        channel: ChannelType
    ): Promise<RohanContext> {
        // Check Redis cache for assembled context
        if (this.redisConnected && this.redis) {
            try {
                const cached = await this.redis.get(redisContextKey(tenantId, leadId));
                if (cached && typeof cached === 'string') {
                    logger.info(`[RohanMemory] Context cache hit for lead ${leadId}`);
                    return JSON.parse(cached) as RohanContext;
                }
            } catch (err: any) {
                logger.warn(`[RohanMemory] Context cache read failed: ${err.message}`);
            }
        }

        // Cache miss — assemble from PostgreSQL (parallel queries)
        logger.info(`[RohanMemory] Assembling context for lead ${leadId} from PostgreSQL`);

        const [leadResult, projectResult, interactionsResult, memoryResult] = await Promise.all([
            this.loadLead(tenantId, leadId),
            this.loadProjectForLead(tenantId, leadId),
            this.loadRecentInteractions(tenantId, leadId, 10),
            this.getOrCreateMemory(tenantId, persona.id, leadId, channel),
        ]);

        const context: RohanContext = {
            persona,
            lead: leadResult || undefined,
            project: projectResult || undefined,
            recent_interactions: interactionsResult,
            conversation_state: memoryResult.conversation_state,
            last_reasoning: memoryResult.last_reasoning,
            semantic_memories: [], // Tier 3: Vector DB — future implementation
        };

        // Cache the assembled context in Redis
        if (this.redisConnected && this.redis) {
            try {
                await this.redis.set(
                    redisContextKey(tenantId, leadId),
                    JSON.stringify(context),
                    { EX: CONTEXT_TTL_SECONDS }
                );
            } catch (err: any) {
                logger.warn(`[RohanMemory] Context cache write failed: ${err.message}`);
            }
        }

        return context;
    }

    /**
     * Invalidate the cached context (call after CRM updates so next
     * turn gets fresh data).
     */
    async invalidateContextCache(tenantId: number, leadId: string): Promise<void> {
        if (this.redisConnected && this.redis) {
            try {
                await this.redis.del(redisContextKey(tenantId, leadId));
            } catch (err: any) {
                logger.warn(`[RohanMemory] Context cache invalidation failed: ${err.message}`);
            }
        }
    }

    // ── Private Loaders ─────────────────────────────────────────────

    private async loadLead(
        tenantId: number,
        leadId: string
    ): Promise<RohanContext['lead'] | null> {
        try {
            const { rows } = await pool.query(
                `SELECT id, name, phone, email, status, source, project_id,
                        budget_min, budget_max, ai_score, sentiment,
                        nurture_stage, notes, tags
                 FROM leads
                 WHERE id = $1 AND tenant_id = $2`,
                [leadId, tenantId]
            );
            return rows[0] || null;
        } catch (err: any) {
            logger.warn(`[RohanMemory] Lead load failed for ${leadId}: ${err.message}`);
            return null;
        }
    }

    private async loadProjectForLead(
        tenantId: number,
        leadId: string
    ): Promise<RohanContext['project'] | null> {
        try {
            const { rows } = await pool.query(
                `SELECT p.id, p.name, p.location, p.price_range_min,
                        p.price_range_max, p.amenities, p.description,
                        p.available_units
                 FROM projects p
                 INNER JOIN leads l ON l.project_id = p.id
                 WHERE l.id = $1 AND p.tenant_id = $2`,
                [leadId, tenantId]
            );
            return rows[0] || null;
        } catch (err: any) {
            logger.warn(`[RohanMemory] Project load failed for lead ${leadId}: ${err.message}`);
            return null;
        }
    }

    private async loadRecentInteractions(
        tenantId: number,
        leadId: string,
        limit: number
    ): Promise<RohanContext['recent_interactions']> {
        try {
            const { rows } = await pool.query(
                `SELECT id, type, note, outcome, created_at
                 FROM interactions
                 WHERE lead_id = $1 AND tenant_id = $2
                 ORDER BY created_at DESC
                 LIMIT $3`,
                [leadId, tenantId, limit]
            );
            return rows;
        } catch (err: any) {
            logger.warn(`[RohanMemory] Interactions load failed for ${leadId}: ${err.message}`);
            return [];
        }
    }

    private async loadStateFromPG(
        tenantId: number,
        leadId: string
    ): Promise<ConversationState | null> {
        try {
            const { rows } = await pool.query(
                `SELECT conversation_state FROM ai_conversation_memory
                 WHERE tenant_id = $1 AND lead_id = $2
                 ORDER BY updated_at DESC LIMIT 1`,
                [tenantId, leadId]
            );
            return rows[0]?.conversation_state || null;
        } catch (err: any) {
            logger.warn(`[RohanMemory] PG state load failed: ${err.message}`);
            return null;
        }
    }

    private async persistStateToPG(
        tenantId: number,
        leadId: string,
        state: ConversationState,
        memoryId?: string
    ): Promise<void> {
        try {
            if (memoryId) {
                await pool.query(
                    `UPDATE ai_conversation_memory
                     SET conversation_state = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [state, memoryId]
                );
            } else {
                // Upsert: find existing or create new
                const { rows } = await pool.query(
                    `SELECT id FROM ai_conversation_memory
                     WHERE tenant_id = $1 AND lead_id = $2
                     ORDER BY updated_at DESC LIMIT 1`,
                    [tenantId, leadId]
                );

                if (rows.length > 0) {
                    await pool.query(
                        `UPDATE ai_conversation_memory
                         SET conversation_state = $1, updated_at = NOW()
                         WHERE id = $2`,
                        [state, rows[0].id]
                    );
                }
                // If no existing record, the getOrCreateMemory call will handle creation
            }
        } catch (err: any) {
            logger.warn(`[RohanMemory] PG state persist failed: ${err.message}`);
        }
    }

    // ── Health Check ────────────────────────────────────────────────

    getHealthStatus(): { redis: boolean; tier: string } {
        return {
            redis: this.redisConnected,
            tier: this.redisConnected ? 'redis+pg' : 'pg-only',
        };
    }

    // ── Cleanup ─────────────────────────────────────────────────────

    async shutdown(): Promise<void> {
        if (this.redis && this.redisConnected) {
            try {
                await this.redis.disconnect();
                logger.info('[RohanMemory] Redis disconnected cleanly');
            } catch (err: any) {
                logger.warn(`[RohanMemory] Redis disconnect error: ${err.message}`);
            }
        }
    }
}

// ── Singleton Export ─────────────────────────────────────────────────
const rohanMemory = new RohanMemory();
export default rohanMemory;
export { RohanMemory, createDefaultConversationState };
