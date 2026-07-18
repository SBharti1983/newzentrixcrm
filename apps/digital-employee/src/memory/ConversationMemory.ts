import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { DbAIConversationMemory, ChannelType, ConversationState, ReasoningOutput } from '@zentrix/types';

export function createDefaultConversationState(channel: ChannelType): ConversationState {
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

export class ConversationMemory {
    async getOrCreateMemory(
        tenantId: number,
        personaId: string,
        leadId: string,
        channel: ChannelType
    ): Promise<DbAIConversationMemory> {
        const { rows } = await pool.query(
            `SELECT * FROM ai_conversation_memory
             WHERE tenant_id = $1 AND lead_id = $2
             ORDER BY updated_at DESC LIMIT 1`,
            [tenantId, leadId]
        );

        if (rows.length > 0) {
            return rows[0] as DbAIConversationMemory;
        }

        const initialState = createDefaultConversationState(channel);
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

        const insertResult = await pool.query(
            `INSERT INTO ai_conversation_memory
                (tenant_id, persona_id, lead_id, channel, conversation_state, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [tenantId, personaId, leadId, channel, initialState, expiresAt]
        );

        return insertResult.rows[0] as DbAIConversationMemory;
    }

    async saveReasoning(memoryId: string, reasoning: ReasoningOutput): Promise<void> {
        await pool.query(
            `UPDATE ai_conversation_memory
             SET last_reasoning = $1,
                 last_reasoning_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [reasoning, memoryId]
        );
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
            logger.warn(`[ConversationMemory] Failed to log reasoning: ${err.message}`);
        }
    }
}
