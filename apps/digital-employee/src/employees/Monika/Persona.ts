/**
 * MonikaPersonaEngine — AI Digital Receptionist Identity, Knowledge & Routing
 *
 * NOTE: This module runs inside apps/digital-employee — isolated from CRM API.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    DbAIEmployeePersona,
    MonikaContext,
    ReceptionistReasoningOutput,
    ReceptionistRouting,
    HandoffTarget,
    StaffDirectoryEntry,
} from '@zentrix/types';
import { loadPrompt } from '../../utils/prompts';
import { sanitizeUserField } from '../../utils/promptTemplate';
import { BasePersonaEngine } from '../BasePersonaEngine';

export class MonikaPersonaEngine extends BasePersonaEngine {
    protected readonly role = 'monika' as const;
    protected readonly logTag = '[MonikaPersona]';
    // Monika's persona query does NOT filter on is_active (legacy behaviour),
    // so we keep requireActive = false to preserve existing behaviour.
    protected readonly requireActive = false;

    // ── System Prompt Builder ───────────────────────────────────────

    buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: MonikaContext,
        track: 'fast' | 'reasoning'
    ): string {
        const config = persona.persona_config;

        const rawIdentity = loadPrompt('system', 'monika_identity.txt');
        let prompt = rawIdentity
            .replace('{employee_name}', persona.employee_name || 'Monika')
            .replace('{tone}', config.tone || 'Helpful, warm, clear, and welcoming')
            .replace('{personality}', config.personality || 'Polite, efficient, and directory-oriented');
        prompt += '\n';

        const baseLanguage = config.language_style || 'hinglish';
        prompt += `[LANGUAGE CONSTRAINT]\n`;
        if (baseLanguage === 'hinglish') {
            prompt += `CRITICAL: You must speak in natural Hinglish (Hindi + English blend written in Latin script).\n`;
            prompt += `Example: "Hello! Maya Infratech reception se Monika. Main aapki kaise help kar sakti hoon?"\n`;
            prompt += `Never use Devnagari. Keep it professional yet friendly.\n\n`;
        } else if (baseLanguage === 'hindi') {
            prompt += `CRITICAL: You must speak in clear Hindi written in Latin script.\n\n`;
        } else {
            prompt += `CRITICAL: You must speak in professional, warm English.\n\n`;
        }

        prompt += `[STAFF DIRECTORY]\n`;
        prompt += `You can transfer callers to the following departments/managers:\n`;
        if (context.staff_directory && context.staff_directory.length > 0) {
            context.staff_directory.forEach((staff: StaffDirectoryEntry) => {
                // item 2.4: sanitize staff names (defensive — they come from DB, not callers)
                prompt += `- ${sanitizeUserField(staff.name, 100)}: role = ${staff.role}. Title: ${sanitizeUserField(staff.title, 100) || 'Staff'}.\n`;
            });
        } else {
            prompt += `- Surendra: Sales Manager (handles pricing discounts, complex inquiries, complaints)\n`;
            prompt += `- Rohan: Sales Executive (handles project details, unit options, brochures, and lead qualification)\n`;
            prompt += `- Neha: Accounts Executive (handles billing, payment schedules, installments)\n`;
        }

        const kScope = persona.knowledge_scope;
        prompt += `\n[KNOWLEDGE SCOPE]\n`;
        prompt += `Company details:\n`;
        prompt += `${kScope.projects || 'Zentrix Realty premium residential and commercial spaces.'}\n`;
        if (kScope.faqs) {
            prompt += `\nUse the following FAQs to answer caller questions directly:\n`;
            prompt += `${kScope.faqs}\n`;
        }

        if (track === 'fast') {
            const rawFast = loadPrompt('system', 'monika_fast.txt');
            const fastBlock = rawFast.replace('{current_goal}', context.conversation_state.current_goal || 'greet');
            prompt += `\n[TRACK A: CONVERSATIONAL RULES]\n`;
            prompt += `${fastBlock}`;
        } else {
            const rawReasoning = loadPrompt('system', 'monika_reasoning.txt');
            const reasoningBlock = rawReasoning.replace('{employee_name}', persona.employee_name || 'Monika');
            prompt += `\n[TRACK B: REASONING RULES]\n`;
            prompt += `${reasoningBlock}`;
        }

        return prompt;
    }

    async getDirectory(tenantId: number): Promise<StaffDirectoryEntry[]> {
        try {
            const { rows } = await pool.query(
                `SELECT id as user_id, name, role, telephony_agent_id 
                 FROM users 
                 WHERE tenant_id = $1 AND is_active = TRUE
                 AND (is_ai_employee IS NULL OR iS_ai_employee = FALSE)`,
                [tenantId]
            );

            const staticRoles: Record<string, string> = {
                admin: 'surendra',
                sales_manager: 'surendra',
                superadmin: 'surendra',
                sales_executive: 'rohan',
                accounts_executive: 'neha',
            };

            const mapped: StaffDirectoryEntry[] = rows.map(r => ({
                name: r.name,
                role: staticRoles[r.role] || 'rohan',
                title: `Internal ${r.role} contact`,
                telephony_agent_id: r.telephony_agent_id || '',
                user_id: r.user_id,
                is_ai: false,
                is_available: true,
            }));

            if (!mapped.some(m => m.role === 'rohan')) {
                mapped.push({
                    name: 'Rohan (AI)',
                    role: 'rohan',
                    title: 'AI Sales Assistant',
                    telephony_agent_id: 'rohan-telephony-agent-id',
                    persona_id: 'rohan-persona-id',
                    is_ai: true,
                    is_available: true,
                });
            }

            return mapped;
        } catch (err) {
            logger.error(`[MonikaPersona] Directory load failed: ${err}`);
            return [
                { name: 'Surendra', role: 'surendra', title: 'Sales Manager', telephony_agent_id: 'surendra-telephony', is_ai: false, is_available: true },
                { name: 'Rohan (AI)', role: 'rohan', title: 'AI Sales Assistant', telephony_agent_id: 'rohan-telephony-agent-id', persona_id: 'rohan-persona-id', is_ai: true, is_available: true },
                { name: 'Neha', role: 'neha', title: 'Accounts Team', telephony_agent_id: 'neha-telephony', is_ai: false, is_available: true },
            ];
        }
    }

    // ── Handoff & Routing Evaluator ─────────────────────────────────

    evaluateRouting(
        persona: DbAIEmployeePersona,
        reasoning: ReceptionistReasoningOutput,
        context: MonikaContext
    ): ReceptionistRouting | null {
        if (reasoning.should_handoff && reasoning.handoff_target) {
            return this.buildRouting(reasoning.handoff_target, reasoning, context, 'customer_request');
        }

        if (reasoning.intent === 'speak_to_manager') {
            return this.buildRouting('surendra', reasoning, context, 'context_based');
        }
        if (reasoning.intent === 'project_inquiry' || reasoning.intent === 'pricing_inquiry') {
            return this.buildRouting('rohan', reasoning, context, 'context_based');
        }

        const userMsg = (context.conversation_state.last_user_message || '').toLowerCase();
        const managerKeywords = ['manager', 'surendra', 'boss', 'senior', 'supervisor', 'complaint', 'shikayat', 'legal', 'rera', 'discount', 'deal karo', 'kam price'];
        const salesKeywords = ['project', 'price', 'unit', 'flat', 'apartment', 'booking', 'site visit', 'visit karna', 'brochure', 'rohan'];

        if (managerKeywords.some(kw => userMsg.includes(kw))) {
            return this.buildRouting('surendra', reasoning, context, 'escalation_rule');
        }
        if (salesKeywords.some(kw => userMsg.includes(kw))) {
            return this.buildRouting('rohan', reasoning, context, 'escalation_rule');
        }

        return null;
    }

    private buildRouting(
        target: HandoffTarget,
        reasoning: ReceptionistReasoningOutput,
        context: MonikaContext,
        reason: ReceptionistRouting['reason']
    ): ReceptionistRouting {
        return {
            target,
            reason,
            brief: reasoning.query_summary || 'Caller routed based on conversation context.',
            mode: 'warm_transfer',
        };
    }

    resolveHandoffTarget(
        target: HandoffTarget,
        context: MonikaContext
    ): StaffDirectoryEntry | null {
        return context.staff_directory.find(s => s.role === target) || null;
    }

    // ── Greeting Generator ──────────────────────────────────────────

    generateGreeting(
        persona: DbAIEmployeePersona,
        callerName: string,
        channel: 'voice' | 'whatsapp' = 'voice'
    ): string {
        const config = persona.persona_config as any;
        const hour = new Date().getHours();
        let baseGreeting: string;
        if (hour < 12) baseGreeting = config.greetingMorning || 'Good morning! Maya Infratech reception se Monika. Main aapki kaise madad kar sakti hoon?';
        else if (hour < 17) baseGreeting = config.greetingAfternoon || 'Good afternoon! Maya Infratech, Monika speaking. Aap kisse baat karna chahte hain?';
        else baseGreeting = config.greetingEvening || 'Good evening! Maya Infratech reception, Monika. Kaise help kar sakti hoon?';

        if (callerName && callerName !== 'Unknown') {
            baseGreeting = baseGreeting.replace('Maya Infratech', `${callerName.split(' ')[0]} ji, Maya Infratech`);
        }

        if (channel === 'whatsapp') {
            baseGreeting += ' Aap kya janna chahte hain?';
        }

        return baseGreeting;
    }
}

const monikaPersonaEngine = new MonikaPersonaEngine();
export default monikaPersonaEngine;
