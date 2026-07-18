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
    SupportedLanguage,
    AIEmployeeRole,
    PersonaNotFoundError,
} from '@zentrix/types';
import { loadPrompt } from '../../utils/prompts';

// ── In-memory persona cache (refreshed every 5 min) ─────────────────
interface PersonaCacheEntry {
    persona: DbAIEmployeePersona;
    cached_at: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const personaCache = new Map<number, PersonaCacheEntry>();

export class MonikaPersonaEngine {
    // ── Persona Loading ─────────────────────────────────────────────

    async getPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        const cached = personaCache.get(tenantId);
        if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
            return cached.persona;
        }

        try {
            const { rows } = await pool.query(
                `SELECT * FROM ai_employee_personas
                 WHERE tenant_id = $1 AND role = 'monika'
                 LIMIT 1`,
                [tenantId]
            );

            if (rows.length === 0) {
                throw new PersonaNotFoundError(tenantId);
            }

            const persona = rows[0] as DbAIEmployeePersona;
            personaCache.set(tenantId, { persona, cached_at: Date.now() });
            return persona;
        } catch (err) {
            if (err instanceof PersonaNotFoundError) throw err;
            logger.error(`[MonikaPersona] Failed to load persona for tenant ${tenantId}: ${err}`);
            throw new PersonaNotFoundError(tenantId);
        }
    }

    async getPersonaByRole(tenantId: number, role: AIEmployeeRole): Promise<DbAIEmployeePersona> {
        try {
            const { rows } = await pool.query(
                `SELECT * FROM ai_employee_personas
                 WHERE tenant_id = $1 AND role = $2
                 LIMIT 1`,
                [tenantId, role]
            );
            if (rows.length === 0) throw new PersonaNotFoundError(tenantId);
            return rows[0] as DbAIEmployeePersona;
        } catch (err) {
            if (err instanceof PersonaNotFoundError) throw err;
            logger.error(`[MonikaPersona] Failed to load persona role=${role} tenant=${tenantId}: ${err}`);
            throw new PersonaNotFoundError(tenantId);
        }
    }

    invalidateCache(tenantId: number): void {
        personaCache.delete(tenantId);
        logger.info(`[MonikaPersona] Cache invalidated for tenant ${tenantId}`);
    }

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
                prompt += `- ${staff.name}: role = ${staff.role}. Title: ${staff.title || 'Staff'}.\n`;
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

    // ── Voice Configuration ─────────────────────────────────────────

    getVoiceForLanguage(
        persona: DbAIEmployeePersona,
        language: SupportedLanguage
    ): string {
        const voiceConfig = persona.voice_config;
        const indianLangs: SupportedLanguage[] = ['hindi', 'tamil', 'telugu', 'kannada', 'marathi', 'bengali', 'gujarati', 'punjabi', 'malayalam', 'odia'];

        if (language === 'english') return voiceConfig.english_voice;
        if (language === 'hinglish' || indianLangs.includes(language)) {
            return voiceConfig.code_mix_voice || voiceConfig.hindi_voice;
        }
        return voiceConfig.hindi_voice;
    }

    getTTSParams(persona: DbAIEmployeePersona): { speed: number; pitch: number } {
        const vc = persona.voice_config;
        return { speed: vc.speed || 1.0, pitch: vc.pitch || 1.0 };
    }

    // ── Filler Word Injection ───────────────────────────────────────

    getRandomFiller(persona: DbAIEmployeePersona): string | null {
        const fillers = persona.persona_config.filler_words;
        if (!fillers || fillers.length === 0) return null;
        return fillers[Math.floor(Math.random() * fillers.length)];
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
