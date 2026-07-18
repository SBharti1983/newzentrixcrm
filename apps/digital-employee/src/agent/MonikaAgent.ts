/**
 * MonikaCognitiveLoop — AI Digital Receptionist Two-Track Cognitive Loop
 *
 * Orchestrates Monika's receptionist conversation loop:
 * 1. Track A (Fast Path): Generates instant caller response (~200ms)
 * 2. Track B (Reasoning Path): Classifies intent, evaluates routing/handoff,
 *    schedules meetings/site visits, and updates CRM state.
 *
 * Key differences from RohanCognitiveLoop:
 *  - Receptionist reasoning schema (intent → route/schedule/answer)
 *  - Routing decisions hand off to Surendra (human) or Rohan (AI sales)
 *  - Scheduling actions persist meetings/site visits
 *  - Caller lookup by phone (not lead nurture pipeline)
 *
 * NOTE: This module lives inside apps/digital-employee to run on a dedicated
 * Node.js event loop, isolated from the CRM API traffic in apps/api.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import monikaPersonaEngine from '../employees/Monika/Persona';
import {
    getMonikaHandoffMessage,
    buildMonikaHandoffBrief,
} from '../employees/Monika/Config';
import monikaSchedulingService from '../skills/SiteVisitBooking';
import rohanMemory from '../memory/MemoryService';
import { executeMonikaReasoning } from '../cognition/reasoning/MonikaReasoning';
import {
    ReceptionistCognitiveInput,
    ReceptionistCognitiveResult,
    ReceptionistReasoningOutput,
    ReceptionistRouting,
    ReceptionistScheduling,
    FastResponse,
    ConversationState,
    MonikaContext,
    StaffDirectoryEntry,
    HandoffTarget,
    SupportedLanguage,
    DbAIEmployeePersona,
} from '@zentrix/types';
import crmUpdater from '../integrations/crm/CrmUpdater';

import { generateAIResponse } from '../ai/AIService';

class MonikaCognitiveLoop {
    /**
     * Process a single turn of a receptionist conversation.
     * Generates Track A response synchronously, fires Track B reasoning async.
     */
    async processCycle(input: ReceptionistCognitiveInput): Promise<ReceptionistCognitiveResult> {
        const startTime = Date.now();
        const { tenant_id, persona_id, lead_id, channel, user_message, detected_language, user_phone, caller_name } = input;

        // 1. Fetch Monika Persona
        const persona = await monikaPersonaEngine.getPersona(tenant_id);

        // 2. Load receptionist context (caller, staff directory, projects, FAQs)
        const context = await this.loadContext(tenant_id, persona, user_phone, caller_name, lead_id, channel, user_message);

        // Update state with incoming message
        context.conversation_state.last_user_message = user_message;
        context.conversation_state.turn_count += 1;

        // 3. Build Track A Fast prompt
        const fastPrompt = monikaPersonaEngine.buildSystemPrompt(persona, context, 'fast');

        // 4. Generate Track A Response (conversational, non-JSON)
        const trackAStart = Date.now();
        const responseText = await generateAIResponse(
            `System Prompt:\n${fastPrompt}\n\nCaller Message: ${user_message}\n\nGenerate Monika's conversational response:`,
            false
        );
        const trackALatency = Date.now() - trackAStart;

        // 5. Filler prefix for voice
        let fillerPrefix: string | undefined = undefined;
        if (channel === 'voice') {
            fillerPrefix = monikaPersonaEngine.getRandomFiller(persona) || undefined;
        }

        const responseLanguage: SupportedLanguage =
            (detected_language || context.conversation_state.language_detected || 'hinglish') as SupportedLanguage;

        // 6. Build FastResponse
        const fastResponse: FastResponse = {
            text: responseText,
            language: responseLanguage,
            filler_prefix: fillerPrefix,
            confidence: 1.0,
            latency_ms: trackALatency,
        };

        const turnNumber = context.conversation_state.turn_count;

        // 7. Get or create memory tracker (reuse Rohan's memory infra)
        const memory = await rohanMemory.getOrCreateMemory(tenant_id, persona.id, lead_id || `caller:${user_phone || 'unknown'}`, channel);

        context.conversation_state.last_rohan_message = responseText;

        // 8. Fire Track B background reasoning
        const reasoningPromise = (async (): Promise<ReceptionistReasoningOutput> => {
            const trackBStart = Date.now();
            try {
                const reasoningRaw = await executeMonikaReasoning(persona, context, user_message);
                const reasoning = this.normalizeReasoning(reasoningRaw);
                const reasoningLatency = Date.now() - trackBStart;

                // Save reasoning to memory
                await rohanMemory.saveReasoning(memory.id, reasoning as any);

                // Evaluate routing / handoff
                const routing = monikaPersonaEngine.evaluateRouting(persona, reasoning, context);
                let scheduling: ReceptionistScheduling | undefined;

                // Handle scheduling action
                if (reasoning.action === 'schedule_meeting' || reasoning.action === 'schedule_site_visit') {
                    scheduling = reasoning.scheduling;
                    if (scheduling) {
                        try {
                            const booking = await monikaSchedulingService.bookMeeting(
                                tenant_id,
                                persona.id,
                                scheduling,
                                context.caller?.name || caller_name || 'Unknown',
                                context.caller?.phone || user_phone || 'Unknown',
                                lead_id
                            );
                            // Stamp the booking id back into the scheduling block
                            scheduling = { ...scheduling, status: booking.status as any };
                            logger.info(`[MonikaCognitiveLoop] Scheduled ${scheduling.type} (id=${booking.id})`);
                        } catch (err: any) {
                            logger.error(`[MonikaCognitiveLoop] Scheduling failed: ${err.message}`);
                        }
                    }
                }

                // Handle handoff / routing
                if (routing) {
                    const target = monikaPersonaEngine.resolveHandoffTarget(routing.target, context);
                    const brief = buildMonikaHandoffBrief(reasoning, context, routing.target);
                    const handoffMsg = getMonikaHandoffMessage(routing.target, context.caller?.name || 'ji', target?.name);
                    await crmUpdater.triggerHandoff(
                        tenant_id,
                        persona,
                        lead_id,
                        memory.id,
                        routing,
                        reasoning,
                        context,
                        target,
                        brief,
                        handoffMsg
                    );
                }

                // Apply CRM updates
                if (lead_id && reasoning.crm_update) {
                    await crmUpdater.applyCRMUpdates(tenant_id, lead_id, reasoning.crm_update);
                }

                // Update conversation state
                const updatedState: ConversationState = {
                    ...context.conversation_state,
                    language_detected: (context.conversation_state.language_detected || responseLanguage) as SupportedLanguage,
                    emotion_trend: [...context.conversation_state.emotion_trend, reasoning.emotion].slice(-5),
                    current_goal: reasoning.next_goal || context.conversation_state.current_goal,
                    missing_info: reasoning.missing_info || context.conversation_state.missing_info,
                    next_action: reasoning.action || context.conversation_state.next_action,
                };

                await rohanMemory.saveConversationState(tenant_id, lead_id || `caller:${user_phone || 'unknown'}`, updatedState, memory.id);
                await rohanMemory.invalidateContextCache(tenant_id, lead_id || `caller:${user_phone || 'unknown'}`);

                // Audit log
                const totalLatency = Date.now() - startTime;
                await rohanMemory.logReasoning(
                    tenant_id,
                    persona.id,
                    lead_id,
                    memory.id,
                    turnNumber,
                    channel,
                    user_message,
                    reasoning as any,
                    responseText,
                    totalLatency,
                    reasoningLatency
                );

                return reasoning;
            } catch (err: any) {
                logger.error(`[MonikaCognitiveLoop] Track B reasoning failed: ${err.message}`);
                throw err;
            }
        })();

        // Pre-compute routing synchronously from the fast path if possible
        // (the authoritative routing comes from Track B, but we expose a
        // best-effort hint on the result so the voice adapter can start
        // preparing a transfer without waiting for Track B.)
        return {
            fast_response: fastResponse,
            reasoning_promise: reasoningPromise,
            memory_id: memory.id,
            turn_number: turnNumber,
        };
    }

    // ── Context Loading ─────────────────────────────────────────────

    /**
     * Build the MonikaContext: caller lookup, staff directory, projects, FAQs.
     */
    private async loadContext(
        tenantId: number,
        persona: DbAIEmployeePersona,
        userPhone?: string,
        callerName?: string,
        leadId?: string,
        channel?: string,
        userMessage?: string
    ): Promise<MonikaContext> {
        // Caller lookup by phone (or lead_id if provided)
        const caller = await this.lookupCaller(tenantId, userPhone, callerName, leadId);

        // Staff directory (humans + AI agents Monika can route to)
        const staffDirectory = await this.loadStaffDirectory(tenantId);

        // Projects (for site visits / general info)
        const projects = await this.loadProjects(tenantId);

        // FAQs (general office queries)
        const faqs = await this.loadFaqs(tenantId);

        // Conversation state from memory
        const stateKey = leadId || `caller:${userPhone || 'unknown'}`;
        let conversationState: ConversationState;
        try {
            const existing = await rohanMemory.loadContext(tenantId, persona, stateKey, (channel as any) || 'voice', userMessage || '');
            conversationState = existing.conversation_state;
        } catch {
            conversationState = this.defaultConversationState();
        }

        return {
            persona,
            caller,
            staff_directory: staffDirectory,
            projects,
            faqs,
            conversation_state: conversationState,
        };
    }

    private async lookupCaller(
        tenantId: number,
        phone?: string,
        name?: string,
        leadId?: string
    ): Promise<MonikaContext['caller']> {
        if (!phone && !leadId) {
            return { name: name || 'Unknown', is_existing_lead: false };
        }
        try {
            if (leadId) {
                const { rows } = await pool.query(
                    `SELECT id, name, phone FROM leads WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
                    [leadId, tenantId]
                );
                if (rows[0]) {
                    return {
                        id: rows[0].id,
                        name: rows[0].name || name || 'Unknown',
                        phone: rows[0].phone || phone,
                        is_existing_lead: true,
                        lead_id: rows[0].id,
                    };
                }
            }
            if (phone) {
                const { rows } = await pool.query(
                    `SELECT id, name, phone FROM leads WHERE phone = $1 AND tenant_id = $2 LIMIT 1`,
                    [phone, tenantId]
                );
                if (rows[0]) {
                    return {
                        id: rows[0].id,
                        name: rows[0].name || name || 'Unknown',
                        phone: rows[0].phone,
                        is_existing_lead: true,
                        lead_id: rows[0].id,
                    };
                }
            }
        } catch (err: any) {
            logger.error(`[MonikaCognitiveLoop] Caller lookup failed: ${err.message}`);
        }
        return { name: name || 'Unknown', phone, is_existing_lead: false };
    }

    private async loadStaffDirectory(tenantId: number): Promise<StaffDirectoryEntry[]> {
        const entries: StaffDirectoryEntry[] = [];
        try {
            // Human staff (managers, sales) — exclude AI employees
            const { rows: humans } = await pool.query(
                `SELECT u.id, u.name, u.role, u.phone, u.telephony_agent_id, u.is_active
                 FROM users u
                 WHERE u.tenant_id = $1
                   AND u.role IN ('admin', 'sales_manager', 'superadmin', 'sales')
                   AND u.is_active = TRUE
                   AND (u.is_ai_employee IS NULL OR u.is_ai_employee = FALSE)
                 ORDER BY u.name`,
                [tenantId]
            );
            for (const h of humans) {
                entries.push({
                    user_id: h.id,
                    name: h.name,
                    role: h.role === 'sales_manager' || h.role === 'admin' || h.role === 'superadmin' ? 'surendra' : h.role,
                    title: h.role === 'sales_manager' ? 'Sales Manager' : h.role === 'admin' ? 'Admin' : 'Sales Executive',
                    is_ai: false,
                    is_available: true,
                    phone: h.phone,
                    telephony_agent_id: h.telephony_agent_id,
                });
            }

            // AI staff (Rohan sales, Neha accounts) — other personas
            const { rows: ais } = await pool.query(
                `SELECT id, employee_name, role, current_status
                 FROM ai_employee_personas
                 WHERE tenant_id = $1 AND role IN ('rohan', 'neha')`,
                [tenantId]
            );
            for (const a of ais) {
                entries.push({
                    persona_id: a.id,
                    name: a.employee_name,
                    role: a.role,
                    title: a.role === 'rohan' ? 'AI Sales Agent' : 'AI Accountant',
                    is_ai: true,
                    is_available: (a.current_status || 'offline') !== 'offline',
                });
            }
        } catch (err: any) {
            logger.error(`[MonikaCognitiveLoop] Staff directory load failed: ${err.message}`);
        }
        return entries;
    }

    private async loadProjects(tenantId: number): Promise<MonikaContext['projects']> {
        try {
            const { rows } = await pool.query(
                `SELECT id, name, location FROM projects WHERE tenant_id = $1 ORDER BY name LIMIT 20`,
                [tenantId]
            );
            return rows.map((r: any) => ({
                id: r.id,
                name: r.name,
                location: r.location,
                site_visit_available: true,
            }));
        } catch (err: any) {
            logger.error(`[MonikaCognitiveLoop] Projects load failed: ${err.message}`);
            return [];
        }
    }

    private async loadFaqs(tenantId: number): Promise<MonikaContext['faqs']> {
        // Static reception FAQs — could be moved to a DB table later.
        return [
            { question: 'Office hours?', answer: 'Monday to Saturday, 9 AM to 7 PM.' },
            { question: 'Office address?', answer: 'Maya Infratech Corporate Office, Noida, Uttar Pradesh.' },
            { question: 'How to book a site visit?', answer: 'I can schedule a site visit for you. Which project and what day suits you?' },
        ];
    }

    private defaultConversationState(): ConversationState {
        return {
            turn_count: 0,
            language_detected: 'hinglish',
            emotion_trend: [],
            current_goal: 'greet_and_understand_intent',
            missing_info: [],
            objections_raised: [],
            documents_shared: [],
            next_action: 'greet',
            conversation_started_at: new Date().toISOString(),
        };
    }

    // ── Reasoning Normalization ─────────────────────────────────────

    /**
     * Normalize the raw LLM JSON into a valid ReceptionistReasoningOutput,
     * filling defaults for any missing fields so downstream code is safe.
     */
    private normalizeReasoning(raw: any): ReceptionistReasoningOutput {
        return {
            intent: raw.intent || 'other',
            emotion: raw.emotion || 'neutral',
            emotion_score: typeof raw.emotion_score === 'number' ? raw.emotion_score : 0,
            query_summary: raw.query_summary || '',
            requested_party: raw.requested_party || undefined,
            missing_info: Array.isArray(raw.missing_info) ? raw.missing_info : [],
            action: raw.action || 'answer_query',
            response: raw.response || '',
            routing: raw.routing || undefined,
            scheduling: raw.scheduling || undefined,
            crm_update: raw.crm_update || {},
            next_goal: raw.next_goal || 'continue_helping',
            should_handoff: Boolean(raw.should_handoff),
            handoff_target: raw.handoff_target || undefined,
            handoff_reason: raw.handoff_reason || undefined,
        };
    }

}

const monikaCognitiveLoop = new MonikaCognitiveLoop();
export default monikaCognitiveLoop;
export { MonikaCognitiveLoop };
