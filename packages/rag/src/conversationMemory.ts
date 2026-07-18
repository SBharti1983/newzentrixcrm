/**
 * Conversation Memory — pgvector Tier-3 Recall
 *
 * Stores embeddings of past Rohan ↔ lead conversation turns so that
 * future turns can semantically recall "what we talked about before with
 * this lead (or similar leads)". This is the long-term semantic tier of
 * RohanMemory, complementing the document-only `ai_knowledge_chunks`.
 *
 * Graceful degradation: every public function returns an empty result
 * (never throws) when pgvector or the embedding API is unavailable, so
 * the cognitive loop can continue with Tier-1/2 memory only.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { getEmbedding } from './embeddings';

export interface ConversationTurnRecord {
    tenantId: number;
    leadId: string;
    personaId: string;
    channel: string;
    turnNumber: number;
    /** Concatenated "user said → rohan replied" text that gets embedded. */
    content: string;
    embedding?: number[];
    metadata?: Record<string, any>;
}

export interface ConversationRecallResult {
    content: string;
    similarity: number;
    leadId?: string;
    channel?: string;
    turnNumber?: number;
    createdAt?: string;
    metadata?: Record<string, any>;
}

/**
 * Ensure the conversation-embeddings table exists. Idempotent — safe to
 * call at startup. Kept separate from document vector init so document
 * and conversation stores can evolve independently.
 */
export async function initializeConversationVectorStore(): Promise<void> {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ai_conversation_embeddings (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       INTEGER NOT NULL,
                lead_id         VARCHAR(100) NOT NULL,
                persona_id      VARCHAR(100) NOT NULL,
                channel         VARCHAR(20) NOT NULL,
                turn_number     INTEGER NOT NULL,
                content         TEXT NOT NULL,
                embedding       VECTOR(768) NOT NULL,
                metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_conv_emb_tenant_lead
            ON ai_conversation_embeddings (tenant_id, lead_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_conv_emb_embedding_cosine
            ON ai_conversation_embeddings
            USING hnsw (embedding vector_cosine_ops)
        `);
        logger.info('[ConversationMemory] Vector store ready');
    } catch (err: any) {
        logger.error(`[ConversationMemory] Init failed: ${err.message}`);
        // Non-fatal — queries will degrade to empty results.
    }
}

/**
 * Embed and store a single conversation turn. Called (fire-and-forget)
 * by RohanMemory after every completed turn so the semantic tier stays
 * current without blocking the response path.
 */
export async function storeConversationTurn(
    record: ConversationTurnRecord
): Promise<void> {
    try {
        let embedding = record.embedding;
        if (!embedding) {
            embedding = await getEmbedding(record.content);
        }
        // Guard against the zero-vector fallback from embeddings.ts
        if (!embedding || embedding.every((v) => v === 0)) {
            logger.warn('[ConversationMemory] Skipping store — zero embedding (API down)');
            return;
        }

        const vectorString = `[${embedding.join(',')}]`;
        await pool.query(
            `INSERT INTO ai_conversation_embeddings
                (tenant_id, lead_id, persona_id, channel, turn_number,
                 content, embedding, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8)`,
            [
                record.tenantId,
                record.leadId,
                record.personaId,
                record.channel,
                record.turnNumber,
                record.content,
                vectorString,
                record.metadata || {},
            ]
        );
    } catch (err: any) {
        logger.warn(`[ConversationMemory] Store failed (non-fatal): ${err.message}`);
    }
}

/**
 * Semantic recall over past conversation turns.
 *
 * @param scopeLeadId  When provided, restricts recall to the same lead
 *                     (personal long-term memory). When omitted, recalls
 *                     across all leads for the tenant (cross-lead patterns).
 */
export async function retrieveSimilarConversations(
    tenantId: number,
    queryEmbedding: number[],
    options: {
        limit?: number;
        minSimilarity?: number;
        scopeLeadId?: string;
    } = {}
): Promise<ConversationRecallResult[]> {
    const { limit = 3, minSimilarity = 0.55, scopeLeadId } = options;

    // Zero-vector guard — embedding API was down, nothing to search with.
    if (!queryEmbedding || queryEmbedding.every((v) => v === 0)) {
        return [];
    }

    try {
        const vectorString = `[${queryEmbedding.join(',')}]`;
        const params: any[] = [vectorString, tenantId, minSimilarity, limit];
        let leadFilter = '';
        if (scopeLeadId) {
            leadFilter = ' AND lead_id = $5';
            params.push(scopeLeadId);
        }

        const { rows } = await pool.query(
            `SELECT content, lead_id, channel, turn_number, metadata, created_at,
                    (1 - (embedding <=> $1::vector)) as similarity
             FROM ai_conversation_embeddings
             WHERE tenant_id = $2
               AND (1 - (embedding <=> $1::vector)) >= $3
               ${leadFilter}
             ORDER BY embedding <=> $1::vector
             LIMIT $4`,
            params
        );

        return rows.map((r) => ({
            content: r.content,
            similarity: parseFloat(r.similarity),
            leadId: r.lead_id,
            channel: r.channel,
            turnNumber: r.turn_number,
            createdAt: r.created_at?.toISOString?.() ?? r.created_at,
            metadata: r.metadata || {},
        }));
    } catch (err: any) {
        logger.warn(`[ConversationMemory] Recall failed (non-fatal): ${err.message}`);
        return [];
    }
}
