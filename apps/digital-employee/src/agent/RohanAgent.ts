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
import rohanPersonaEngine from '../employees/Rohan/Persona';
import rohanEnglishPersona from '../employees/Rohan/EnglishPersona';
import rohanHindiPersona from '../employees/Rohan/HindiPersona';
import { buildContextBrief } from '../employees/Rohan/Config';
import rohanMemory from '../memory/MemoryService';
import { executeRohanReasoning } from '../cognition/reasoning/RohanReasoning';
import {
    CognitiveInput,
    CognitiveResult,
    FastResponse,
    ReasoningOutput,
    ConversationState,
    RohanContext,
    EscalationType,
    SupportedLanguage,
    DbAIEmployeePersona,
} from '@zentrix/types';
import crmUpdater from '../integrations/crm/CrmUpdater';

// ── Local AI helper (lightweight, avoids coupling to apps/api) ──────
import { generateAIResponse, generateAIResponseStream } from '../ai/AIService';

class RohanCognitiveLoop {
    /**
     * Process a single turn of conversation.
     * Generates Track A response synchronously (or streams it via callback), and fires Track B reasoning asynchronously.
     */
    async processCycle(input: CognitiveInput, onSentence?: (sentence: string) => void): Promise<CognitiveResult> {
        const startTime = Date.now();
        const { tenant_id, persona_id, lead_id, channel, user_message, detected_language } = input;

        // 1. Fetch Persona Config
        const persona = await rohanPersonaEngine.getPersona(tenant_id);

        // 2. Fetch full lead context (Redis / PostgreSQL + dynamic pgvector RAG)
        const context = await rohanMemory.loadContext(tenant_id, persona, lead_id || 'system-test-lead', channel, user_message);

        // Update state with incoming user message
        context.conversation_state.last_user_message = user_message;
        context.conversation_state.turn_count += 1;

        // Determine output language
        const responseLanguage: SupportedLanguage = (detected_language || context.conversation_state.language_detected || 'hinglish') as SupportedLanguage;

        // Choose persona engine based on language (default Hinglish, specialized for English / Hindi)
        let engine = rohanPersonaEngine;
        if (responseLanguage === 'english') {
            engine = rohanEnglishPersona;
        } else if (responseLanguage === 'hindi') {
            engine = rohanHindiPersona;
        }

        // 3. Build Track A Fast prompt
        const fastPrompt = engine.buildSystemPrompt(persona, context, 'fast');

        // 4. Generate Track A Response (Conversational, Non-JSON, supports streaming)
        const trackAStart = Date.now();
        let responseTextRaw = '';

        if (onSentence) {
            const stream = generateAIResponseStream(
                `System Prompt:\n${fastPrompt}\n\nLead Message: ${user_message}\n\nGenerate Rohan's conversational response:`,
                false
            );

            let sentenceBuffer = '';
            for await (const chunk of stream) {
                responseTextRaw += chunk;
                sentenceBuffer += chunk;

                // Split on sentence/clause boundaries: . ? ! । (Devanagari danda) \n
                let boundaryIndex = -1;
                const match = sentenceBuffer.match(/[.?!।\n]/);
                if (match && match.index !== undefined) {
                    boundaryIndex = match.index + 1;
                } else if (sentenceBuffer.length > 80) {
                    // Force split on spaces or comma/semicolon if the segment grows too long
                    const commaMatch = sentenceBuffer.match(/[,;:]/);
                    if (commaMatch && commaMatch.index !== undefined) {
                        boundaryIndex = commaMatch.index + 1;
                    } else {
                        // Split on the last space to avoid cutting in the middle of a word
                        const lastSpace = sentenceBuffer.lastIndexOf(' ');
                        if (lastSpace > 40) {
                            boundaryIndex = lastSpace + 1;
                        }
                    }
                }

                if (boundaryIndex !== -1) {
                    const sentence = sentenceBuffer.substring(0, boundaryIndex).trim();
                    sentenceBuffer = sentenceBuffer.substring(boundaryIndex);

                    if (sentence) {
                        // Clean up response conversational labels if present
                        let cleanSentence = sentence.replace(/^(Rohan|Rohan's Response|Rohan Mishra|Agent|AI)\s*(\(voice\))?:\s*/i, '').trim();
                        if (cleanSentence.startsWith('"')) cleanSentence = cleanSentence.substring(1);
                        if (cleanSentence.endsWith('"')) cleanSentence = cleanSentence.slice(0, -1);
                        cleanSentence = cleanSentence.trim();

                        if (cleanSentence) {
                            onSentence(cleanSentence);
                        }
                    }
                }
            }

            // Flush remaining buffer
            const remaining = sentenceBuffer.trim();
            if (remaining) {
                let cleanSentence = remaining.replace(/^(Rohan|Rohan's Response|Rohan Mishra|Agent|AI)\s*(\(voice\))?:\s*/i, '').trim();
                if (cleanSentence.startsWith('"')) cleanSentence = cleanSentence.substring(1);
                if (cleanSentence.endsWith('"')) cleanSentence = cleanSentence.slice(0, -1);
                cleanSentence = cleanSentence.trim();
                if (cleanSentence) {
                    onSentence(cleanSentence);
                }
            }
        } else {
            responseTextRaw = await generateAIResponse(
                `System Prompt:\n${fastPrompt}\n\nLead Message: ${user_message}\n\nGenerate Rohan's conversational response:`,
                false
            );
        }

        const trackALatency = Date.now() - trackAStart;

        let cleanText = responseTextRaw || '';
        // Strip conversational labels like Rohan:, Rohan's Response (voice): etc.
        cleanText = cleanText.replace(/^(Rohan|Rohan's Response|Rohan Mishra|Agent|AI)\s*(\(voice\))?:\s*/i, '').trim();
        // Remove surrounding quotes if model outputs quoted string
        if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
            cleanText = cleanText.slice(1, -1).trim();
        }

        // 5. Select conversational filler prefix if channel is voice
        let fillerPrefix: string | undefined = undefined;
        if (channel === 'voice') {
            fillerPrefix = engine.getRandomFiller(persona) || undefined;
        }

        // 6. Build FastResponse
        const fastResponse: FastResponse = {
            text: cleanText,
            language: responseLanguage,
            filler_prefix: fillerPrefix,
            confidence: 1.0,
            latency_ms: trackALatency
        };

        const turnNumber = context.conversation_state.turn_count;

        // 7. Get or create PostgreSQL Memory Tracker
        const memory = await rohanMemory.getOrCreateMemory(tenant_id, persona.id, lead_id || 'system-test-lead', channel);

        // Update memory trace context for Track B thinking
        context.conversation_state.last_rohan_message = cleanText;

        // 8. Fire Track B background reasoning task
        const reasoningPromise = (async () => {
            const trackBStart = Date.now();
            try {
                const reasoning = await executeRohanReasoning(persona, context, user_message);
                const reasoningLatency = Date.now() - trackBStart;

                // Save reasoning context to Postgres memory
                await rohanMemory.saveReasoning(memory.id, reasoning);

                // Evaluate escalation triggers
                const escalationTriggered = rohanPersonaEngine.evaluateEscalation(persona, reasoning, context);
                if (escalationTriggered) {
                    const escalationAction = rohanPersonaEngine.getEscalationAction(persona, escalationTriggered);
                    await crmUpdater.triggerEscalation(tenant_id, persona, lead_id, memory.id, escalationTriggered, reasoning, context, escalationAction);
                }

                // Apply CRM updates to lead table
                if (lead_id && reasoning.crm_update) {
                    await crmUpdater.applyCRMUpdates(tenant_id, lead_id, reasoning.crm_update);
                }

                // Trigger CRM Automations based on action intents (if enabled on dashboard)
                const pConfig = persona.persona_config as any;
                if (lead_id && pConfig.automationsEnabled !== false && (reasoning.action === 'send_document' || reasoning.action === 'schedule_visit')) {
                    await crmUpdater.triggerAutomation(
                        tenant_id,
                        lead_id,
                        reasoning.action,
                        reasoning.objection,
                        reasoning.crm_update?.notes || ''
                    );
                }

                // Update ConversationState state properties
                const updatedState: ConversationState = {
                    ...context.conversation_state,
                    language_detected: (context.conversation_state.language_detected || responseLanguage) as SupportedLanguage,
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
                    cleanText,
                    totalLatency,
                    reasoningLatency
                );

                return reasoning;
            } catch (err: any) {
                logger.error(`[RohanCognitiveLoop] Track B background reasoning failed: ${err.message}`);
                // Degrade gracefully — return a default reasoning so the promise resolves
                // instead of leaving an unhandled rejection that silently drifts lead state.
                const fallbackReasoning: ReasoningOutput = {
                    intent: 'unknown',
                    emotion: 'neutral',
                    emotion_score: 0,
                    stage: (context.conversation_state.current_goal || 'awareness') as any,
                    missing_info: [],
                    objection: null,
                    action: 'respond',
                    response: cleanText,
                    crm_update: null,
                    next_goal: (context.conversation_state.current_goal || 'qualify_and_engage') as any,
                    should_escalate: false,
                    escalation_type: null,
                };
                return fallbackReasoning;
            }
        })();

        return {
            fast_response: fastResponse,
            reasoning_promise: reasoningPromise,
            memory_id: memory.id,
            turn_number: turnNumber
        };
    }
}

const rohanCognitiveLoop = new RohanCognitiveLoop();
export default rohanCognitiveLoop;
export { RohanCognitiveLoop };
