/**
 * RohanCognitiveLoop — Two-Track Cognitive Loop Orchestrator
 *
 * Orchestrates the execution of Rohan's AI Digital Employee loop:
 * 1. Synchronous Track A (Fast Path): Generates instant user response (~200ms)
 * 2. Asynchronous Track B (Reasoning Path): Analyzes intent/emotions, updates CRM and working states
 *
 * NOTE: This module lives inside apps/digital-employee to run on a dedicated
 * Node.js event loop, isolated from the CRM API traffic in apps/api.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import rohanPersonaEngine from './RohanPersonaEngine';
import rohanMemory from './RohanMemory';
import {
    CognitiveInput,
    CognitiveResult,
    FastResponse,
    ReasoningOutput,
    ConversationState,
    RohanContext,
    EscalationType,
    SupportedLanguage,
} from '@zentrix/types';

// ── Local AI helper (lightweight, avoids coupling to apps/api) ──────
import { generateAIResponse } from '../utils/ai';

class RohanCognitiveLoop {
    /**
     * Process a single turn of conversation.
     * Generates Track A response synchronously, and fires Track B reasoning asynchronously.
     */
    async processCycle(input: CognitiveInput): Promise<CognitiveResult> {
        const startTime = Date.now();
        const { tenant_id, persona_id, lead_id, channel, user_message, detected_language } = input;

        // 1. Fetch Persona Config
        const persona = await rohanPersonaEngine.getPersona(tenant_id);

        // 2. Fetch full lead context (Redis / PostgreSQL)
        const context = await rohanMemory.loadContext(tenant_id, persona, lead_id || 'system-test-lead', channel);

        // Update state with incoming user message
        context.conversation_state.last_user_message = user_message;
        context.conversation_state.turn_count += 1;

        // 3. Build Track A Fast prompt
        const fastPrompt = rohanPersonaEngine.buildSystemPrompt(persona, context, 'fast');

        // 4. Generate Track A Response (Conversational, Non-JSON)
        const trackAStart = Date.now();
        const responseText = await generateAIResponse(
            `System Prompt:\n${fastPrompt}\n\nLead Message: ${user_message}\n\nGenerate Rohan's conversational response:`,
            false
        );
        const trackALatency = Date.now() - trackAStart;

        // 5. Select conversational filler prefix if channel is voice
        let fillerPrefix: string | undefined = undefined;
        if (channel === 'voice') {
            fillerPrefix = rohanPersonaEngine.getRandomFiller(persona) || undefined;
        }

        // Determine output language
        const responseLanguage: SupportedLanguage = (detected_language || context.conversation_state.language_detected || 'hinglish') as SupportedLanguage;

        // 6. Build FastResponse
        const fastResponse: FastResponse = {
            text: responseText,
            language: responseLanguage,
            filler_prefix: fillerPrefix,
            confidence: 1.0,
            latency_ms: trackALatency
        };

        const turnNumber = context.conversation_state.turn_count;

        // 7. Get or create PostgreSQL Memory Tracker
        const memory = await rohanMemory.getOrCreateMemory(tenant_id, persona.id, lead_id || 'system-test-lead', channel);

        // Update memory trace context for Track B thinking
        context.conversation_state.last_rohan_message = responseText;

        // 8. Fire Track B background reasoning task
        const reasoningPromise = (async () => {
            const trackBStart = Date.now();
            try {
                // Build Track B reasoning prompt
                const reasoningPrompt = rohanPersonaEngine.buildSystemPrompt(persona, context, 'reasoning');

                // Generate reasoning output (JSON structured format)
                const reasoningRaw = await generateAIResponse(
                    `System Prompt:\n${reasoningPrompt}\n\nLead Message: ${user_message}\n\nGenerate structured analysis JSON:`,
                    true
                );

                const reasoning: ReasoningOutput = reasoningRaw as ReasoningOutput;
                const reasoningLatency = Date.now() - trackBStart;

                // Save reasoning context to Postgres memory
                await rohanMemory.saveReasoning(memory.id, reasoning);

                // Evaluate escalation triggers
                const escalationTriggered = rohanPersonaEngine.evaluateEscalation(persona, reasoning, context);
                if (escalationTriggered) {
                    await this.triggerEscalation(tenant_id, persona.id, lead_id, memory.id, escalationTriggered, reasoning, context);
                }

                // Apply CRM updates to lead table
                if (lead_id && reasoning.crm_update) {
                    await this.applyCRMUpdates(tenant_id, lead_id, reasoning.crm_update);
                }

                // Update ConversationState state properties
                const updatedState: ConversationState = {
                    ...context.conversation_state,
                    language_detected: (reasoningRaw.crm_update?.language || context.conversation_state.language_detected || responseLanguage) as SupportedLanguage,
                    emotion_trend: [...context.conversation_state.emotion_trend, reasoning.emotion].slice(-5),
                    current_goal: reasoning.next_goal || context.conversation_state.current_goal,
                    missing_info: reasoning.missing_info || context.conversation_state.missing_info,
                    objections_raised: reasoning.objection ? [...context.conversation_state.objections_raised, reasoning.objection.type].filter((v, i, self) => self.indexOf(v) === i) : context.conversation_state.objections_raised,
                    next_action: reasoning.action || context.conversation_state.next_action,
                };

                // Persist state to Redis / PG
                await rohanMemory.saveConversationState(tenant_id, lead_id || 'system-test-lead', updatedState, memory.id);

                // Invalidate context cache for next turn
                await rohanMemory.invalidateContextCache(tenant_id, lead_id || 'system-test-lead');

                // Audit Log Reasoning Cycle
                const totalLatency = Date.now() - startTime;
                await rohanMemory.logReasoning(
                    tenant_id,
                    persona.id,
                    lead_id,
                    memory.id,
                    turnNumber,
                    channel,
                    user_message,
                    reasoning,
                    responseText,
                    totalLatency,
                    reasoningLatency
                );

                return reasoning;
            } catch (err: any) {
                logger.error(`[RohanCognitiveLoop] Track B background reasoning failed: ${err.message}`);
                throw err;
            }
        })();

        return {
            fast_response: fastResponse,
            reasoning_promise: reasoningPromise,
            memory_id: memory.id,
            turn_number: turnNumber
        };
    }

    /**
     * Records an escalation event in the database for human agent notification.
     */
    private async triggerEscalation(
        tenantId: number,
        personaId: string,
        leadId: string | undefined,
        memoryId: string,
        type: EscalationType,
        reasoning: ReasoningOutput,
        context: RohanContext
    ): Promise<void> {
        try {
            logger.info(`🚨 [RohanCognitiveLoop] Escalation triggered for tenant ${tenantId}, lead ${leadId}: ${type}`);

            // Insert escalation event
            await pool.query(
                `INSERT INTO ai_escalation_events 
                    (tenant_id, persona_id, lead_id, memory_id, escalation_type, trigger_reason, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [tenantId, personaId, leadId || null, memoryId, type, reasoning.objection?.text || `Triggered by ${type} rules`, 'pending']
            );

            // Future note: Socket notifications to active dashboard UI go here
        } catch (err: any) {
            logger.error(`[RohanCognitiveLoop] Failed to record escalation event: ${err.message}`);
        }
    }

    /**
     * Applies AI insights directly to CRM leads.
     */
    private async applyCRMUpdates(
        tenantId: number,
        leadId: string,
        update: any
    ): Promise<void> {
        try {
            logger.info(`[RohanCognitiveLoop] Applying CRM updates for lead ${leadId}:`, update);

            const updates: string[] = [];
            const values: any[] = [];
            let placeholderCount = 1;

            if (update.stage_change) {
                updates.push(`status = $${placeholderCount++}`);
                values.push(update.stage_change);
                updates.push(`nurture_stage = $${placeholderCount++}`);
                values.push(update.stage_change);
            }

            if (update.sentiment) {
                updates.push(`sentiment = $${placeholderCount++}`);
                values.push(update.sentiment);
            }

            if (update.lead_score_delta) {
                updates.push(`ai_score = COALESCE(ai_score, 0) + $${placeholderCount++}`);
                values.push(update.lead_score_delta);
            }

            if (update.notes) {
                updates.push(`notes = CONCAT(COALESCE(notes, ''), '\n', $${placeholderCount++})`);
                values.push(`[Rohan AI]: ${update.notes}`);
            }

            if (updates.length > 0) {
                values.push(leadId, tenantId);
                const query = `UPDATE leads 
                               SET ${updates.join(', ')}, updated_at = NOW() 
                               WHERE id = $${placeholderCount++} AND tenant_id = $${placeholderCount++}`;
                await pool.query(query, values);
            }
        } catch (err: any) {
            logger.error(`[RohanCognitiveLoop] Failed to apply CRM updates: ${err.message}`);
        }
    }
}

const rohanCognitiveLoop = new RohanCognitiveLoop();
export default rohanCognitiveLoop;
export { RohanCognitiveLoop };
