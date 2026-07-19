/**
 * MonikaCognitiveLoop — AI Digital Receptionist Two-Track Cognitive Loop
 *
 * Extends BaseCognitiveLoop (template-method) so Monika inherits the shared
 * Track A / Track B orchestration, sentence streaming (item 1.4), Track B
 * timeout + abort (item 1.3), reasoning validation + repair retry
 * (items 4.1 / 4.3), and graceful fallback on Track B failure (item 1.2).
 *
 * Monika-specific behaviour lives in the hooks:
 *  - loadContext(): caller lookup + staff directory + projects + FAQs
 *  - executeReasoning(): delegates to executeMonikaReasoning
 *  - validateReasoningOutput(): receptionist schema (intent/emotion/action/
 *    response/next_goal)
 *  - normalizeReasoning(): fills defaults for optional receptionist fields
 *  - buildFallbackReasoning(): safe default (answer_query, neutral)
 *  - applyReasoningSideEffects(): scheduling (meetings/site visits) +
 *    routing/handoff to Surendra (human) or Rohan (AI sales)
 *  - getMemoryKey(): `caller:{phone}` (or lead_id when present)
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
    ConversationState,
    MonikaContext,
    StaffDirectoryEntry,
    DbAIEmployeePersona,
} from '@zentrix/types';
import crmUpdater from '../integrations/crm/CrmUpdater';

import {
    BaseCognitiveLoop,
    ReasoningValidationResult,
} from './BaseCognitiveLoop';

class MonikaCognitiveLoop extends BaseCognitiveLoop<
    ReceptionistCognitiveInput,
    MonikaContext,
    ReceptionistCognitiveResult,
    ReceptionistReasoningOutput
> {
    protected readonly logTag = '[MonikaCognitiveLoop]';
    protected readonly role = 'monika' as const;

    // ── Hooks ────────────────────────────────────────────────────────

    protected fetchPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        return monikaPersonaEngine.getPersona(tenantId);
    }

    protected async loadContext(
        input: ReceptionistCognitiveInput,
        persona: DbAIEmployeePersona
    ): Promise<MonikaContext> {
        const { tenant_id, user_phone, caller_name, lead_id, channel, user_message } = input;

        const caller = await this.lookupCaller(tenant_id, user_phone, caller_name, lead_id);
        const staffDirectory = await this.loadStaffDirectory(tenant_id);
        const projects = await this.loadProjects(tenant_id);
        const faqs = await this.loadFaqs(tenant_id);

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
            staff_directory: staffDirectory,
            projects,
            faqs,
            conversation_state: conversationState,
        };
    }

    protected buildFastPrompt(persona: DbAIEmployeePersona, context: MonikaContext): string {
        return monikaPersonaEngine.buildSystemPrompt(persona, context, 'fast');
    }

    protected async executeReasoning(
        persona: DbAIEmployeePersona,
        context: MonikaContext,
        userMessage: string,
        signal?: AbortSignal
    ): Promise<ReceptionistReasoningOutput> {
        // Forward the abort signal so Track B timeout / barge-in can cancel
        // the in-flight reasoning request (items 1.3 / 3.3).
        return executeMonikaReasoning(persona, context, userMessage, signal);
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

    protected normalizeReasoning(raw: any): ReceptionistReasoningOutput {
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

    protected buildFallbackReasoning(
        _context: MonikaContext,
        cleanText: string
    ): ReceptionistReasoningOutput {
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

    protected getMemoryKey(input: ReceptionistCognitiveInput): string {
        return input.lead_id || `caller:${input.user_phone || 'unknown'}`;
    }

    protected getFillerPrefix(persona: DbAIEmployeePersona): string | null {
        return monikaPersonaEngine.getRandomFiller(persona);
    }

    protected userMessageLabel(): string {
        return 'Caller Message';
    }

    protected employeeName(_persona: DbAIEmployeePersona): string {
        return 'Monika';
    }

    protected async applyReasoningSideEffects(
        input: ReceptionistCognitiveInput,
        persona: DbAIEmployeePersona,
        context: MonikaContext,
        reasoning: ReceptionistReasoningOutput,
        memoryId: string
    ): Promise<void> {
        const { tenant_id, lead_id, user_phone, caller_name } = input;

        // Evaluate routing / handoff
        const routing = monikaPersonaEngine.evaluateRouting(persona, reasoning, context);

        // Handle scheduling action
        if (reasoning.action === 'schedule_meeting' || reasoning.action === 'schedule_site_visit') {
            const scheduling: ReceptionistScheduling | undefined = reasoning.scheduling;
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
                    // Stamp the booking status back into the scheduling block
                    reasoning.scheduling = { ...scheduling, status: booking.status as any };
                    logger.info(`${this.logTag} Scheduled ${scheduling.type} (id=${booking.id})`);
                } catch (err: any) {
                    logger.error(`${this.logTag} Scheduling failed: ${err.message}`);
                }
            }
        }

        // Handle handoff / routing
        if (routing) {
            const target = monikaPersonaEngine.resolveHandoffTarget(routing.target, context);
            const brief = buildMonikaHandoffBrief(reasoning, context, routing.target);
            const handoffMsg = getMonikaHandoffMessage(
                routing.target,
                context.caller?.name || 'ji',
                target?.name
            );
            await crmUpdater.triggerHandoff(
                tenant_id,
                persona,
                lead_id,
                memoryId,
                routing,
                reasoning,
                context,
                target,
                brief,
                handoffMsg
            );
        }
    }

    // ── Context-loading helpers (private) ────────────────────────────

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
            logger.error(`${this.logTag} Caller lookup failed: ${err.message}`);
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
            logger.error(`${this.logTag} Staff directory load failed: ${err.message}`);
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
            logger.error(`${this.logTag} Projects load failed: ${err.message}`);
            return [];
        }
    }

    private async loadFaqs(_tenantId: number): Promise<MonikaContext['faqs']> {
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
}

const monikaCognitiveLoop = new MonikaCognitiveLoop();
export default monikaCognitiveLoop;
export { MonikaCognitiveLoop };
