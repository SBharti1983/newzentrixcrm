/**
 * NehaCognitiveLoop — AI Digital Accountant Two-Track Cognitive Loop
 *
 * Extends BaseCognitiveLoop (template-method) so Neha inherits the shared
 * Track A / Track B orchestration, sentence streaming (item 1.4), Track B
 * timeout + abort (item 1.3), reasoning validation + repair retry
 * (items 4.1 / 4.3), and graceful fallback on Track B failure (item 1.2).
 *
 * Neha-specific behaviour lives in the hooks:
 *  - loadContext(): caller lookup (customers → leads) + manager directory +
 *    recent filings + outstanding dues + accounts FAQs
 *  - executeReasoning(): delegates to executeNehaReasoning
 *  - validateReasoningOutput(): accountant schema (intent/emotion/action/
 *    response/next_goal)
 *  - normalizeReasoning(): fills defaults for optional accountant fields
 *  - buildFallbackReasoning(): safe default (answer_query, neutral)
 *  - applyReasoningSideEffects(): filing task persistence + simulated
 *    progress + handoff to Surendra (human accounts manager)
 *  - getMemoryKey(): `caller:{phone}` (or lead_id when present)
 *  - emitTurnEvents(): preserves the existing neha:* event stream (item 1.5)
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
import nehaEventBroadcaster from '../observability/EventBroadcaster';
import {
    AccountantCognitiveInput,
    AccountantCognitiveResult,
    AccountantReasoningOutput,
    AccountantFilingDecision,
    ConversationState,
    NehaContext,
    StaffDirectoryEntry,
    SupportedLanguage,
    DbAIEmployeePersona,
    FilingType,
    FilingStatus,
} from '@zentrix/types';

import {
    BaseCognitiveLoop,
    ReasoningValidationResult,
} from './BaseCognitiveLoop';

class NehaCognitiveLoop extends BaseCognitiveLoop<
    AccountantCognitiveInput,
    NehaContext,
    AccountantCognitiveResult,
    AccountantReasoningOutput
> {
    protected readonly logTag = '[NehaCognitiveLoop]';
    protected readonly role = 'neha' as const;

    // ── Hooks ────────────────────────────────────────────────────────

    protected fetchPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        return nehaPersonaEngine.getPersona(tenantId);
    }

    protected async loadContext(
        input: AccountantCognitiveInput,
        persona: DbAIEmployeePersona
    ): Promise<NehaContext> {
        const { tenant_id, user_phone, caller_name, lead_id, channel, user_message } = input;

        const caller = await this.lookupCaller(tenant_id, user_phone, caller_name, lead_id);
        const managerDirectory = await this.loadManagerDirectory(tenant_id);
        const recentFilings = await this.loadRecentFilings(tenant_id, caller);
        const outstandingDues = await this.loadOutstandingDues(tenant_id, caller);
        const faqs = this.loadFaqs();

        const stateKey = lead_id || `caller:${user_phone || 'unknown'}`;
        let conversationState: ConversationState;
        try {
            const existing = await rohanMemory.loadContext(
                tenant_id,
                persona,
                stateKey,
                (channel as any) || 'voice',
                user_message || ''
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

    protected buildFastPrompt(persona: DbAIEmployeePersona, context: NehaContext): string {
        return nehaPersonaEngine.buildSystemPrompt(persona, context, 'fast');
    }

    protected async executeReasoning(
        persona: DbAIEmployeePersona,
        context: NehaContext,
        userMessage: string,
        _signal?: AbortSignal
    ): Promise<AccountantReasoningOutput> {
        return executeNehaReasoning(persona, context, userMessage);
    }

    protected validateReasoningOutput(raw: any): ReasoningValidationResult {
        const missing: string[] = [];
        if (!raw || typeof raw !== 'object') {
            return { valid: false, missing: ['<root>'] };
        }
        if (!raw.intent) missing.push('intent');
        if (!raw.emotion) missing.push('emotion');
        if (!raw.action) missing.push('action');
        if (raw.response === undefined || raw.response === null || raw.response === '') {
            missing.push('response');
        }
        if (!raw.next_goal) missing.push('next_goal');
        return { valid: missing.length === 0, missing };
    }

    protected normalizeReasoning(raw: any): AccountantReasoningOutput {
        return {
            intent: raw.intent || 'other',
            emotion: raw.emotion || 'neutral',
            emotion_score: typeof raw.emotion_score === 'number' ? raw.emotion_score : 0,
            query_summary: raw.query_summary || '',
            requested_party: raw.requested_party || undefined,
            missing_info: Array.isArray(raw.missing_info) ? raw.missing_info : [],
            action: raw.action || 'answer_query',
            response: raw.response || '',
            filing: raw.filing || undefined,
            crm_update: raw.crm_update || {},
            next_goal: raw.next_goal || 'continue_helping',
            should_handoff: Boolean(raw.should_handoff),
            handoff_target: raw.handoff_target || undefined,
            handoff_reason: raw.handoff_reason || undefined,
        };
    }

    protected buildFallbackReasoning(
        _context: NehaContext,
        cleanText: string
    ): AccountantReasoningOutput {
        return {
            intent: 'other',
            emotion: 'neutral',
            emotion_score: 0,
            query_summary: 'fallback — reasoning unavailable',
            missing_info: [],
            action: 'answer_query',
            response: cleanText,
            crm_update: {},
            next_goal: 'continue_helping',
            should_handoff: false,
        };
    }

    protected getMemoryKey(input: AccountantCognitiveInput): string {
        return input.lead_id || `caller:${input.user_phone || 'unknown'}`;
    }

    protected getFillerPrefix(persona: DbAIEmployeePersona): string | null {
        return nehaPersonaEngine.getRandomFiller(persona);
    }

    protected userMessageLabel(): string {
        return 'Caller Message';
    }

    protected employeeName(_persona: DbAIEmployeePersona): string {
        return 'Neha';
    }

    protected async applyReasoningSideEffects(
        input: AccountantCognitiveInput,
        persona: DbAIEmployeePersona,
        context: NehaContext,
        reasoning: AccountantReasoningOutput,
        memoryId: string
    ): Promise<void> {
        const { tenant_id, lead_id, user_phone, caller_name } = input;

        // Evaluate routing / handoff
        const routing = nehaPersonaEngine.evaluateRouting(persona, reasoning, context);

        // Handle filing action — persist a filing task
        if (
            reasoning.action === 'initiate_gst_filing' ||
            reasoning.action === 'initiate_itr_filing'
        ) {
            const filing: AccountantFilingDecision | undefined = reasoning.filing;
            if (filing) {
                try {
                    const taskId = await this.persistFilingTask(tenant_id, persona.id, context, filing);
                    logger.info(
                        `${this.logTag} Filing task created: ${filing.type}` +
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
                        channel: input.channel,
                        turn_number: context.conversation_state.turn_count,
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
                    logger.error(`${this.logTag} Filing task persist failed: ${err.message}`);
                }
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
                memoryId,
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
                channel: input.channel,
                turn_number: context.conversation_state.turn_count,
                handoff_target: routing.target,
                handoff_reason: routing.reason || 'context_threshold',
                handoff_message: handoffMsg,
                manager_name: target?.name,
                timestamp: Date.now(),
            });
        }
    }

    // ── Observability override (item 1.5): preserve neha:* events ────

    protected emitTurnEvents(event: {
        type: 'turn_started' | 'track_a_response' | 'reasoning_complete' | 'reasoning_failed';
        input: AccountantCognitiveInput;
        persona: DbAIEmployeePersona;
        context: NehaContext;
        payload?: any;
    }): void {
        const { input, persona, context, payload } = event;
        const { tenant_id, lead_id, user_phone, caller_name, channel } = input;
        const turnNumber = context.conversation_state.turn_count;

        switch (event.type) {
            case 'turn_started':
                nehaEventBroadcaster.emit({
                    type: 'neha:turn_started',
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    user_message: payload?.user_message || '',
                    detected_language: payload?.detected_language,
                    timestamp: Date.now(),
                });
                break;

            case 'track_a_response':
                nehaEventBroadcaster.emit({
                    type: 'neha:track_a_response',
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    response_text: payload?.response_text || '',
                    latency_ms: payload?.latency_ms || 0,
                    language: payload?.language,
                    filler_prefix: payload?.filler_prefix,
                    timestamp: Date.now(),
                });
                break;

            case 'reasoning_complete': {
                const r = payload?.reasoning || {};
                nehaEventBroadcaster.emit({
                    type: 'neha:reasoning_complete',
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    intent: r.intent || 'unknown',
                    action: r.action || 'none',
                    emotion: r.emotion || 'neutral',
                    // item 4.5: distinguish null (unknown) from a numeric score.
                    confidence: typeof r.emotion_score === 'number' ? r.emotion_score : null,
                    reasoning_latency_ms: payload?.reasoning_latency_ms || 0,
                    total_latency_ms: payload?.total_latency_ms || 0,
                    next_goal: r.next_goal,
                    missing_info: r.missing_info,
                    timestamp: Date.now(),
                });
                break;
            }

            case 'reasoning_failed':
                // No dedicated neha:* event for failure — log only.
                logger.warn(
                    `${this.logTag} reasoning_failed event (turn ${turnNumber}): ${payload?.error}`
                );
                break;
        }
    }

    // ── Context-loading helpers (private) ────────────────────────────

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
            logger.error(`${this.logTag} Caller lookup failed: ${err.message}`);
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
            logger.error(`${this.logTag} Manager directory load failed: ${err.message}`);
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
            logger.warn(`${this.logTag} Recent filings load skipped: ${err.message}`);
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
            logger.warn(`${this.logTag} Outstanding dues load skipped: ${err.message}`);
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

                    logger.info(`${this.logTag} Filing task ${taskId} progressed to: ${step.status} - "${step.msg}"`);
                } catch (err: any) {
                    logger.error(`${this.logTag} Simulated filing step failed: ${err.message}`);
                }
            }
        })();
    }
}

const nehaCognitiveLoop = new NehaCognitiveLoop();
export default nehaCognitiveLoop;
