/**
 * NehaCognitiveLoop — AI Digital Accountant Two-Track Cognitive Loop
 *
 * Orchestrates Neha's accountant conversation loop:
 * 1. Track A (Fast Path): Generates instant caller response (~200ms)
 * 2. Track B (Reasoning Path): Classifies intent, evaluates filing decisions,
 *    collects documents, updates CRM state, and hands off to Surendra
 *    (human manager) on context or caller request.
 *
 * Key differences from MonikaCognitiveLoop:
 *  - Accountant reasoning schema (intent → file_gst / file_itr / answer_query)
 *  - Loads recent filings + outstanding dues for the caller
 *  - Persists filing tasks to ai_filing_tasks table
 *  - Handoff target is Surendra (human accounts manager) only
 *  - Caller lookup against customers table (gstin/pan) + leads fallback
 *
 * NOTE: This module lives inside apps/digital-employee to run on a dedicated
 * Node.js event loop, isolated from the CRM API traffic in apps/api.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import nehaPersonaEngine from '../employees/Neha/Persona';
import {
    getNehaHandoffMessage,
    buildNehaHandoffBrief,
    resolveManager,
    toGenericRouting,
} from '../employees/Neha/Config';
import { documentsNeededForFiling } from '../employees/Neha/Skills';
import rohanMemory from '../memory/MemoryService';
import { executeNehaReasoning } from '../cognition/reasoning/NehaReasoning';
import crmUpdater from '../integrations/crm/CrmUpdater';
import { generateAIResponse } from '../ai/AIService';
import nehaEventBroadcaster from '../observability/EventBroadcaster';
import {
    AccountantCognitiveInput,
    AccountantCognitiveResult,
    AccountantReasoningOutput,
    AccountantRouting,
    AccountantFilingDecision,
    FastResponse,
    ConversationState,
    NehaContext,
    StaffDirectoryEntry,
    SupportedLanguage,
    DbAIEmployeePersona,
    FilingType,
    FilingStatus,
} from '@zentrix/types';

class NehaCognitiveLoop {
    /**
     * Process a single turn of an accountant conversation.
     * Generates Track A response synchronously, fires Track B reasoning async.
     */
    async processCycle(input: AccountantCognitiveInput): Promise<AccountantCognitiveResult> {
        const startTime = Date.now();
        const {
            tenant_id,
            persona_id,
            lead_id,
            channel,
            user_message,
            detected_language,
            user_phone,
            caller_name,
        } = input;

        // 1. Fetch Neha Persona
        const persona = await nehaPersonaEngine.getPersona(tenant_id);

        // 2. Load accountant context (caller, manager directory, filings, dues, FAQs)
        const context = await this.loadContext(
            tenant_id,
            persona,
            user_phone,
            caller_name,
            lead_id,
            channel,
            user_message
        );

        // Update state with incoming message
        context.conversation_state.last_user_message = user_message;
        context.conversation_state.turn_count += 1;

        // ── Event: turn started ──
        nehaEventBroadcaster.emit({
            type: 'neha:turn_started',
            tenant_id,
            persona_id: persona.id,
            lead_id: lead_id || null,
            caller_phone: user_phone,
            caller_name,
            channel,
            turn_number: context.conversation_state.turn_count,
            user_message: user_message,
            detected_language: detected_language || undefined,
            timestamp: Date.now(),
        });

        // 3. Build Track A Fast prompt
        const fastPrompt = nehaPersonaEngine.buildSystemPrompt(persona, context, 'fast');

        // 4. Generate Track A Response (conversational, non-JSON)
        const trackAStart = Date.now();
        const responseTextRaw = await generateAIResponse(
            `System Prompt:\n${fastPrompt}\n\nCaller Message: ${user_message}\n\nGenerate Neha's conversational response:`,
            false
        );
        const trackALatency = Date.now() - trackAStart;

        let cleanText = responseTextRaw || '';
        // Strip conversational labels like Neha:, Neha's Response (voice): etc.
        cleanText = cleanText.replace(/^(Neha|Neha's Response|Neha Mishra|Agent|AI)\s*(\(voice\))?:\s*/i, '').trim();
        // Remove surrounding quotes if model outputs quoted string
        if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
            cleanText = cleanText.slice(1, -1).trim();
        }

        // 5. Filler prefix for voice
        let fillerPrefix: string | undefined = undefined;
        if (channel === 'voice') {
            fillerPrefix = nehaPersonaEngine.getRandomFiller(persona) || undefined;
        }

        const responseLanguage: SupportedLanguage =
            (detected_language || context.conversation_state.language_detected || 'hinglish') as SupportedLanguage;

        // 6. Build FastResponse
        const fastResponse: FastResponse = {
            text: cleanText,
            language: responseLanguage,
            filler_prefix: fillerPrefix,
            confidence: 1.0,
            latency_ms: trackALatency,
        };

        // ── Event: Track A response ready ──
        nehaEventBroadcaster.emit({
            type: 'neha:track_a_response',
            tenant_id,
            persona_id: persona.id,
            lead_id: lead_id || null,
            caller_phone: user_phone,
            caller_name,
            channel,
            turn_number: context.conversation_state.turn_count,
            response_text: cleanText,
            latency_ms: trackALatency,
            language: responseLanguage,
            filler_prefix: fillerPrefix,
            timestamp: Date.now(),
        });

        const turnNumber = context.conversation_state.turn_count;

        // 7. Get or create memory tracker (reuse Rohan's memory infra)
        const memory = await rohanMemory.getOrCreateMemory(
            tenant_id,
            persona.id,
            lead_id || `caller:${user_phone || 'unknown'}`,
            channel
        );

        context.conversation_state.last_rohan_message = cleanText;

        // 8. Fire Track B background reasoning
        const reasoningPromise = (async (): Promise<AccountantReasoningOutput> => {
            const trackBStart = Date.now();
            try {
                const reasoningRaw = await executeNehaReasoning(persona, context, user_message);
                const reasoning = reasoningRaw;
                const reasoningLatency = Date.now() - trackBStart;

                // Save reasoning to memory
                await rohanMemory.saveReasoning(memory.id, reasoning as any);

                // Evaluate routing / handoff
                const routing = nehaPersonaEngine.evaluateRouting(persona, reasoning, context);

                // Handle filing action — persist a filing task
                let filing: AccountantFilingDecision | undefined;
                if (
                    reasoning.action === 'initiate_gst_filing' ||
                    reasoning.action === 'initiate_itr_filing'
                ) {
                    filing = reasoning.filing;
                        try {
                            const taskId = await this.persistFilingTask(tenant_id, persona.id, context, filing);
                            logger.info(
                                `[NehaCognitiveLoop] Filing task created: ${filing.type}` +
                                (filing.gst_return_type ? ` (${filing.gst_return_type})` : '') +
                                ` period=${filing.period || 'n/a'} (ID: ${taskId})`
                            );
                            // ── Event: filing task created ──
                            nehaEventBroadcaster.emit({
                                type: 'neha:filing_created',
                                tenant_id,
                                persona_id: persona.id,
                                lead_id: lead_id || null,
                                caller_phone: user_phone,
                                caller_name,
                                channel,
                                turn_number: turnNumber,
                                filing_type: filing.type,
                                gst_return_type: filing.gst_return_type,
                                period: filing.period,
                                status: 'draft',
                                required_documents: documentsNeededForFiling(
                                    filing.type,
                                    filing.gst_return_type
                                ),
                                customer_id: context.caller?.id || null,
                                timestamp: Date.now(),
                            });

                            // Trigger simulated progress steps in background
                            this.runSimulatedFiling(tenant_id, persona.id, taskId, filing);
                        } catch (err: any) {
                            logger.error(`[NehaCognitiveLoop] Filing task persist failed: ${err.message}`);
                        }
                }

                // Handle handoff / routing to Surendra
                if (routing) {
                    const target = resolveManager(routing.target, context);
                    const brief = buildNehaHandoffBrief(reasoning, context, routing.target, routing);
                    const handoffMsg = getNehaHandoffMessage(
                        routing.target,
                        context.caller?.name || caller_name || 'ji',
                        target?.name
                    );
                    await crmUpdater.triggerHandoff(
                        tenant_id,
                        persona,
                        lead_id,
                        memory.id,
                        toGenericRouting(routing),
                        reasoning,
                        context,
                        target,
                        brief,
                        handoffMsg
                    );
                    // ── Event: handoff to human manager ──
                    nehaEventBroadcaster.emit({
                        type: 'neha:handoff',
                        tenant_id,
                        persona_id: persona.id,
                        lead_id: lead_id || null,
                        caller_phone: user_phone,
                        caller_name,
                        channel,
                        turn_number: turnNumber,
                        handoff_target: routing.target,
                        handoff_reason: routing.reason || 'context_threshold',
                        handoff_message: handoffMsg,
                        manager_name: target?.name,
                        timestamp: Date.now(),
                    });
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

                await rohanMemory.saveConversationState(
                    tenant_id,
                    lead_id || `caller:${user_phone || 'unknown'}`,
                    updatedState,
                    memory.id
                );
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
                    cleanText,
                    totalLatency,
                    reasoningLatency
                );

                // ── Event: reasoning complete ──
                nehaEventBroadcaster.emit({
                    type: 'neha:reasoning_complete',
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    intent: reasoning.intent || 'unknown',
                    action: reasoning.action || 'none',
                    emotion: reasoning.emotion || 'neutral',
                    confidence: (reasoning.emotion_score ?? 0.5),
                    reasoning_latency_ms: reasoningLatency,
                    total_latency_ms: totalLatency,
                    next_goal: reasoning.next_goal,
                    missing_info: reasoning.missing_info,
                    timestamp: Date.now(),
                });

                return reasoning;
            } catch (err: any) {
                logger.error(`[NehaCognitiveLoop] Track B reasoning failed: ${err.message}`);
                throw err;
            }
        })();

        return {
            fast_response: fastResponse,
            reasoning_promise: reasoningPromise,
            memory_id: memory.id,
            turn_number: turnNumber,
        };
    }

    // ── Context Loading ─────────────────────────────────────────────

    /**
     * Build the NehaContext: caller lookup, manager directory, recent filings,
     * outstanding dues, and accounts FAQs.
     */
    private async loadContext(
        tenantId: number,
        persona: DbAIEmployeePersona,
        userPhone?: string,
        callerName?: string,
        leadId?: string,
        channel?: string,
        userMessage?: string
    ): Promise<NehaContext> {
        const caller = await this.lookupCaller(tenantId, userPhone, callerName, leadId);
        const managerDirectory = await this.loadManagerDirectory(tenantId);
        const recentFilings = await this.loadRecentFilings(tenantId, caller);
        const outstandingDues = await this.loadOutstandingDues(tenantId, caller);
        const faqs = this.loadFaqs();

        // Conversation state from memory
        const stateKey = leadId || `caller:${userPhone || 'unknown'}`;
        let conversationState: ConversationState;
        try {
            const existing = await rohanMemory.loadContext(
                tenantId,
                persona,
                stateKey,
                (channel as any) || 'voice',
                userMessage || ''
            );
            conversationState = existing.conversation_state;
        } catch {
            conversationState = this.defaultConversationState();
        }

        return {
            persona,
            caller,
            manager_directory: managerDirectory,
            recent_filings: recentFilings,
            outstanding_dues: outstandingDues,
            faqs,
            conversation_state: conversationState,
        };
    }

    /**
     * Look up the caller against the customers table (gstin/pan) first,
     * then fall back to leads. Returns a NehaContext.caller shape.
     */
    private async lookupCaller(
        tenantId: number,
        phone?: string,
        name?: string,
        leadId?: string
    ): Promise<NehaContext['caller']> {
        if (!phone && !leadId) {
            return { name: name || 'Unknown', is_existing_customer: false };
        }
        try {
            // 1. Try customers table by phone
            if (phone) {
                const { rows } = await pool.query(
                    `SELECT id, name, phone, email, gstin, pan
                     FROM customers
                     WHERE tenant_id = $1 AND phone = $2
                     LIMIT 1`,
                    [tenantId, phone]
                );
                if (rows[0]) {
                    return {
                        id: rows[0].id,
                        name: rows[0].name || name || 'Unknown',
                        phone: rows[0].phone || phone,
                        email: rows[0].email || undefined,
                        gstin: rows[0].gstin || undefined,
                        pan: rows[0].pan || undefined,
                        is_existing_customer: true,
                        lead_id: leadId,
                    };
                }
            }
            // 2. Fall back to leads table
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
                        is_existing_customer: false,
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
                        is_existing_customer: false,
                        lead_id: rows[0].id,
                    };
                }
            }
        } catch (err: any) {
            logger.error(`[NehaCognitiveLoop] Caller lookup failed: ${err.message}`);
        }
        return { name: name || 'Unknown', phone, is_existing_customer: false };
    }

    /**
     * Load human managers Neha can hand off to (Surendra and other admins).
     */
    private async loadManagerDirectory(tenantId: number): Promise<StaffDirectoryEntry[]> {
        const entries: StaffDirectoryEntry[] = [];
        try {
            const { rows } = await pool.query(
                `SELECT u.id, u.name, u.role, u.phone, u.telephony_agent_id
                 FROM users u
                 WHERE u.tenant_id = $1
                   AND u.role IN ('admin', 'sales_manager', 'superadmin')
                   AND u.is_active = TRUE
                   AND (u.is_ai_employee IS NULL OR u.is_ai_employee = FALSE)
                 ORDER BY
                   CASE u.role
                     WHEN 'superadmin' THEN 1
                     WHEN 'admin' THEN 2
                     WHEN 'sales_manager' THEN 3
                   END,
                   u.name`,
                [tenantId]
            );
            for (const h of rows) {
                entries.push({
                    user_id: h.id,
                    name: h.name,
                    role: 'surendra',
                    title:
                        h.role === 'superadmin'
                            ? 'Director'
                            : h.role === 'admin'
                                ? 'Accounts Manager'
                                : 'Manager',
                    is_ai: false,
                    is_available: true,
                    phone: h.phone,
                    telephony_agent_id: h.telephony_agent_id,
                });
            }
        } catch (err: any) {
            logger.error(`[NehaCognitiveLoop] Manager directory load failed: ${err.message}`);
        }
        // Fallback static Surendra entry if no managers configured
        if (entries.length === 0) {
            entries.push({
                name: 'Surendra',
                role: 'surendra',
                title: 'Accounts Manager',
                is_ai: false,
                is_available: true,
            });
        }
        return entries;
    }

    /**
     * Load recent filing tasks for the caller (for status queries).
     */
    private async loadRecentFilings(
        tenantId: number,
        caller: NehaContext['caller']
    ): Promise<NehaContext['recent_filings']> {
        if (!caller?.id) return [];
        try {
            const { rows } = await pool.query(
                `SELECT id, filing_type, gst_return_type, period, status, created_at
                 FROM ai_filing_tasks
                 WHERE tenant_id = $1 AND customer_id = $2
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [tenantId, caller.id]
            );
            return rows.map((r: any) => ({
                id: r.id,
                filing_type: r.filing_type as FilingType,
                gst_return_type: r.gst_return_type || undefined,
                period: r.period || '',
                status: r.status as FilingStatus,
                created_at: r.created_at,
            }));
        } catch (err: any) {
            // Table may not exist yet (pre-migration) — degrade gracefully
            logger.warn(`[NehaCognitiveLoop] Recent filings load skipped: ${err.message}`);
            return [];
        }
    }

    /**
     * Load outstanding dues / payment schedule for the caller.
     */
    private async loadOutstandingDues(
        tenantId: number,
        caller: NehaContext['caller']
    ): Promise<NehaContext['outstanding_dues']> {
        if (!caller?.id) return [];
        try {
            const { rows } = await pool.query(
                `SELECT id, description, amount, due_date, status
                 FROM installments
                 WHERE tenant_id = $1
                   AND (customer_id = $2 OR lead_id = $2)
                   AND status NOT IN ('paid', 'cancelled')
                 ORDER BY due_date ASC
                 LIMIT 10`,
                [tenantId, caller.id]
            );
            return rows.map((r: any) => ({
                id: r.id,
                description: r.description || 'Installment',
                amount: Number(r.amount) || 0,
                due_date: r.due_date || undefined,
                status: r.status || 'pending',
            }));
        } catch (err: any) {
            logger.warn(`[NehaCognitiveLoop] Outstanding dues load skipped: ${err.message}`);
            return [];
        }
    }

    /**
     * Static accounts / tax FAQs Neha can answer directly.
     */
    private loadFaqs(): NehaContext['faqs'] {
        return [
            {
                question: 'What is GST?',
                answer:
                    'GST (Goods and Services Tax) is an indirect tax on the supply of goods and services in India. It has three components: CGST, SGST, and IGST.',
            },
            {
                question: 'What is GSTR-1?',
                answer:
                    'GSTR-1 is a monthly return showing outward supplies (sales) of goods and services. Due by the 11th of the following month.',
            },
            {
                question: 'What is GSTR-3B?',
                answer:
                    'GSTR-3B is a summary monthly return showing total sales, ITC claimed, and net tax payable. Due by the 20th of the following month.',
            },
            {
                question: 'What is ITR?',
                answer:
                    'ITR (Income Tax Return) is a form filed annually declaring income, deductions, and tax liability to the Income Tax Department.',
            },
            {
                question: 'What documents are needed for GST registration?',
                answer:
                    'PAN, Aadhaar, business address proof, bank statement/cancelled cheque, and digital signature (DSC) for companies.',
            },
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

    // ── Filing Task Persistence ──────────────────────────────────────

    /**
     * Persist a filing task to the ai_filing_tasks table.
     * Computes required documents from the Skills module.
     */
    private async persistFilingTask(
        tenantId: number,
        personaId: string,
        context: NehaContext,
        filing: AccountantFilingDecision
    ): Promise<string> {
        const requiredDocs = documentsNeededForFiling(
            filing.type,
            filing.gst_return_type
        );
        const customerId = context.caller?.id || null;
        const leadId = context.caller?.lead_id || null;

        const { rows } = await pool.query(
            `INSERT INTO ai_filing_tasks
                (tenant_id, persona_id, customer_id, lead_id, filing_type,
                 gst_return_type, period, status, required_documents,
                 collected_documents, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
             RETURNING id`,
            [
                tenantId,
                personaId,
                customerId,
                leadId,
                filing.type,
                filing.gst_return_type || null,
                filing.period || null,
                'draft', // initialize status as draft
                JSON.stringify(requiredDocs),
                JSON.stringify(filing.documents_requested || []),
                filing.note || null,
            ]
        );
        return rows[0].id;
    }

    /**
     * Run simulated filing progress steps asynchronously in the background.
     * Emits events to the event broadcaster and updates DB statuses step by step.
     */
    private async runSimulatedFiling(
        tenantId: number,
        personaId: string,
        taskId: string,
        filing: any
    ): Promise<void> {
        const steps = [
            { msg: 'Opening GST Portal (https://services.gst.gov.in/services/login)...', status: 'draft' },
            { msg: 'Entering credentials for user authentication...', status: 'draft' },
            { msg: 'Navigating to Returns Dashboard and verifying tax period July 2025...', status: 'documents_requested' },
            { msg: 'Extracting and parsing Outward Supplies Register spreadsheet...', status: 'documents_received' },
            { msg: 'Uploading sales invoice records (24 invoices parsed)...', status: 'prepared' },
            { msg: 'Validating GSTR-1 summaries and tax calculations...', status: 'pending_authorization' },
            { msg: 'Generating GSTR-1 draft and signing return submission...', status: 'filed' },
            { msg: 'Return submitted successfully! Confirmation sent to customer.', status: 'confirmation_sent' }
        ];

        // Detached async execution block
        (async () => {
            for (let i = 0; i < steps.length; i++) {
                // Wait 4 seconds between steps to visually demonstrate the progress sequence
                await new Promise((resolve) => setTimeout(resolve, 4000));
                const step = steps[i];

                try {
                    // 1. Emit live event
                    nehaEventBroadcaster.emit({
                        type: 'neha:filing_progress',
                        tenant_id: tenantId,
                        persona_id: personaId,
                        action: step.msg,
                        filing_type: filing.type,
                        gst_return_type: filing.gst_return_type,
                        timestamp: Date.now()
                    });

                    // 2. Update status in database
                    await pool.query(
                        `UPDATE ai_filing_tasks 
                         SET status = $1, updated_at = NOW() 
                         WHERE id = $2`,
                        [step.status, taskId]
                    );

                    logger.info(`[NehaCognitiveLoop] Filing task ${taskId} progressed to: ${step.status} - "${step.msg}"`);
                } catch (err: any) {
                    logger.error(`[NehaCognitiveLoop] Simulated filing step failed: ${err.message}`);
                }
            }
        })();
    }
}

const nehaCognitiveLoop = new NehaCognitiveLoop();
export default nehaCognitiveLoop;
