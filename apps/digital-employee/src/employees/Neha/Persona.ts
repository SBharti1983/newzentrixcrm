/**
 * NehaPersonaEngine — AI Digital Accountant Identity, Knowledge & Handoff
 *
 * Neha mimics a real human accountant. She handles inbound customer calls
 * for finance, GST, ITR, invoices, and payment schedules, and hands off to
 * the real human manager Surendra on context or customer request.
 *
 * NOTE: This module runs inside apps/digital-employee — isolated from CRM API.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    DbAIEmployeePersona,
    NehaContext,
    AccountantReasoningOutput,
    AccountantRouting,
    AccountantHandoffTarget,
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

export class NehaPersonaEngine {
    // ── Persona Loading ─────────────────────────────────────────────

    async getPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        const cached = personaCache.get(tenantId);
        if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
            return cached.persona;
        }

        try {
            const { rows } = await pool.query(
                `SELECT * FROM ai_employee_personas
                 WHERE tenant_id = $1 AND role = 'neha' AND is_active = TRUE
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
            logger.error(`[NehaPersona] Failed to load persona for tenant ${tenantId}: ${err}`);
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
            logger.error(`[NehaPersona] Failed to load persona role=${role} tenant=${tenantId}: ${err}`);
            throw new PersonaNotFoundError(tenantId);
        }
    }

    invalidateCache(tenantId: number): void {
        personaCache.delete(tenantId);
        logger.info(`[NehaPersona] Cache invalidated for tenant ${tenantId}`);
    }

    // ── System Prompt Builder ───────────────────────────────────────

    buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: NehaContext,
        track: 'fast' | 'reasoning'
    ): string {
        const config = persona.persona_config;

        // Language constraint block
        const baseLanguage = config.language_style || 'hinglish';
        const languageBlock = this.buildLanguageBlock(baseLanguage);

        // Manager directory block
        const managerDirectory = this.buildManagerDirectoryBlock(context);

        // Knowledge scope block
        const kScope = persona.knowledge_scope;
        const knowledgeScope = this.buildKnowledgeScopeBlock(kScope);

        // FAQs block
        const faqsBlock = this.buildFaqsBlock(context);

        // Customer context block
        const customerBlock = this.buildCustomerBlock(context);

        // Filings + dues blocks
        const filingsBlock = this.buildFilingsBlock(context);
        const duesBlock = this.buildDuesBlock(context);

        // Conversation state block
        const conversationStateBlock = this.buildConversationStateBlock(context);

        // Load and compile identity template
        const rawIdentity = loadPrompt('accounts', 'neha_identity.txt');
        const identityBlock = rawIdentity
            .replace('{employee_name}', persona.employee_name || 'Neha')
            .replace('{tone}', config.tone || 'Calm, precise, reassuring, and professional')
            .replace('{personality}', config.personality || 'Patient, detail-oriented, trustworthy with numbers')
            .replace('{language_block}', languageBlock)
            .replace('{manager_directory}', managerDirectory)
            .replace('{knowledge_scope}', knowledgeScope)
            .replace('{faqs_block}', faqsBlock)
            .replace('{customer_block}', customerBlock)
            .replace('{filings_block}', filingsBlock)
            .replace('{dues_block}', duesBlock)
            .replace('{conversation_state_block}', conversationStateBlock);

        if (track === 'fast') {
            const rawFast = loadPrompt('accounts', 'neha_fast.txt');
            const fastBlock = rawFast
                .replace('{employee_name}', persona.employee_name || 'Neha')
                .replace('{current_goal}', context.conversation_state.current_goal || 'greet_and_identify_query');
            return `${identityBlock}\n\n${fastBlock}`;
        }

        const rawReasoning = loadPrompt('accounts', 'neha_reasoning.txt');
        const reasoningBlock = rawReasoning.replace('{employee_name}', persona.employee_name || 'Neha');
        return `${identityBlock}\n\n${reasoningBlock}`;
    }

    private buildLanguageBlock(languageStyle: string): string {
        if (languageStyle === 'hinglish') {
            return `CRITICAL: You must speak in natural Hinglish (Hindi + English blend written in Latin script).
Example: "Namaste! Main Neha, Zentrix ki accountant. Aapka GST ya ITR query hai? Bataiye kaise help kar sakti hoon."
Never use Devnagari. Keep it professional yet warm.`;
        }
        if (languageStyle === 'hindi') {
            return `CRITICAL: You must speak in clear Hindi written in Latin script.`;
        }
        return `CRITICAL: You must speak in professional, clear English.`;
    }

    private buildManagerDirectoryBlock(context: NehaContext): string {
        if (context.manager_directory && context.manager_directory.length > 0) {
            return context.manager_directory
                .map((s: StaffDirectoryEntry) => `- ${s.name}: ${s.title || 'Manager'} (role=${s.role})`)
                .join('\n');
        }
        return `- Surendra: Manager (handles legal/audit, fee waivers, complaints, human authorization)`;
    }

    private buildKnowledgeScopeBlock(kScope: any): string {
        const parts: string[] = [];
        parts.push(`Services: ${kScope.projects || 'GST filing, ITR filing, invoicing, payment schedules, accounts queries'}`);
        if (kScope.faqs) parts.push(`FAQ topics: ${kScope.faqs}`);
        if (kScope.boundaries) parts.push(`Boundaries: ${kScope.boundaries}`);
        return parts.join('\n');
    }

    private buildFaqsBlock(context: NehaContext): string {
        if (!context.faqs || context.faqs.length === 0) return 'No specific FAQs loaded.';
        return context.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    }

    private buildCustomerBlock(context: NehaContext): string {
        const c = context.caller;
        if (!c) return 'CUSTOMER: Unknown caller. Ask for their name and GSTIN/PAN.';
        const parts: string[] = [`Name: ${c.name}`];
        if (c.phone) parts.push(`Phone: ${c.phone}`);
        if (c.email) parts.push(`Email: ${c.email}`);
        if (c.gstin) parts.push(`GSTIN: ${c.gstin}`);
        if (c.pan) parts.push(`PAN: ${c.pan}`);
        parts.push(`Existing customer: ${c.is_existing_customer ? 'Yes' : 'No'}`);
        return `CUSTOMER:\n${parts.join('\n')}`;
    }

    private buildFilingsBlock(context: NehaContext): string {
        if (!context.recent_filings || context.recent_filings.length === 0) {
            return 'FILING HISTORY: No prior filings on record.';
        }
        const lines = context.recent_filings.map(f => {
            const label = f.filing_type === 'gst' ? `GST ${f.gst_return_type || ''}`.trim() : 'ITR';
            return `- ${label} for ${f.period} — status: ${f.status} (filed ${f.created_at})`;
        });
        return `FILING HISTORY:\n${lines.join('\n')}`;
    }

    private buildDuesBlock(context: NehaContext): string {
        if (!context.outstanding_dues || context.outstanding_dues.length === 0) {
            return 'OUTSTANDING DUES: None on record.';
        }
        const lines = context.outstanding_dues.map(d => {
            const due = d.due_date ? ` (due ${d.due_date})` : '';
            return `- ${d.description}: ₹${d.amount}${due} — ${d.status}`;
        });
        return `OUTSTANDING DUES:\n${lines.join('\n')}`;
    }

    private buildConversationStateBlock(context: NehaContext): string {
        const s = context.conversation_state;
        return `CONVERSATION STATE:
Turn: ${s.turn_count}
Language: ${s.language_detected}
Current Goal: ${s.current_goal}
Emotion Trend: ${s.emotion_trend.join(' → ') || 'None yet'}
Missing Info: ${s.missing_info.join(', ') || 'None'}
Next Action: ${s.next_action}
${s.last_user_message ? `Last User Message: "${s.last_user_message}"` : ''}`;
    }

    // ── Manager Directory Loader ────────────────────────────────────

    async getManagerDirectory(tenantId: number): Promise<StaffDirectoryEntry[]> {
        try {
            const { rows } = await pool.query(
                `SELECT id as user_id, name, role, telephony_agent_id, phone
                 FROM users
                 WHERE tenant_id = $1 AND is_active = TRUE
                 AND (is_ai_employee IS NULL OR is_ai_employee = FALSE)
                 AND role IN ('admin', 'sales_manager', 'superadmin')`,
                [tenantId]
            );

            const mapped: StaffDirectoryEntry[] = rows.map((r: any) => ({
                user_id: r.user_id,
                name: r.name,
                role: 'surendra',
                title: 'Manager',
                telephony_agent_id: r.telephony_agent_id || '',
                phone: r.phone || '',
                is_ai: false,
                is_available: true,
            }));

            if (mapped.length === 0) {
                mapped.push({
                    name: 'Surendra',
                    role: 'surendra',
                    title: 'Manager',
                    telephony_agent_id: 'surendra-telephony',
                    is_ai: false,
                    is_available: true,
                });
            }

            return mapped;
        } catch (err) {
            logger.error(`[NehaPersona] Manager directory load failed: ${err}`);
            return [
                { name: 'Surendra', role: 'surendra', title: 'Manager', telephony_agent_id: 'surendra-telephony', is_ai: false, is_available: true },
            ];
        }
    }

    // ── Handoff / Routing Evaluator ─────────────────────────────────

    evaluateRouting(
        persona: DbAIEmployeePersona,
        reasoning: AccountantReasoningOutput,
        context: NehaContext
    ): AccountantRouting | null {
        // 1. Explicit reasoning-driven handoff
        if (reasoning.should_handoff && reasoning.handoff_target) {
            return this.buildRouting(reasoning.handoff_target, reasoning, context, 'customer_request');
        }

        // 2. Intent-based routing
        if (reasoning.intent === 'speak_to_manager') {
            return this.buildRouting('surendra', reasoning, context, 'context_based');
        }
        if (reasoning.intent === 'complaint' || reasoning.intent === 'legal_audit_query') {
            return this.buildRouting('surendra', reasoning, context, 'context_based');
        }

        // 3. Keyword-based escalation rules
        const userMsg = (context.conversation_state.last_user_message || '').toLowerCase();
        const managerKeywords = [
            'manager', 'surendra', 'sir', 'human', 'insse baat', 'inshe baat',
            'complaint', 'shikayat', 'legal', 'audit', 'notice', 'scrutiny', 'appeal',
            'waiver', 'maaf', 'discount', 'refund karo', 'penalty hatao',
        ];

        if (managerKeywords.some(kw => userMsg.includes(kw))) {
            return this.buildRouting('surendra', reasoning, context, 'escalation_rule');
        }

        // 4. Negative sentiment threshold
        const rules = persona.escalation_rules as any;
        if (
            rules?.negative_sentiment_below !== undefined &&
            reasoning.emotion_score < rules.negative_sentiment_below
        ) {
            return this.buildRouting('surendra', reasoning, context, 'escalation_rule');
        }

        return null;
    }

    private buildRouting(
        target: AccountantHandoffTarget,
        reasoning: AccountantReasoningOutput,
        _context: NehaContext,
        reason: AccountantRouting['reason']
    ): AccountantRouting {
        return {
            target,
            reason,
            brief: reasoning.query_summary || 'Caller routed to manager based on conversation context.',
            mode: 'warm_transfer',
        };
    }

    resolveHandoffTarget(
        target: AccountantHandoffTarget,
        context: NehaContext
    ): StaffDirectoryEntry | null {
        if (target === 'voicemail') return null;
        return context.manager_directory.find(s => s.role === target) || null;
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
        if (hour < 12) baseGreeting = config.greetingMorning || 'Good morning! Zentrix accounts se Neha. GST, ITR ya payment related koi query hai?';
        else if (hour < 17) baseGreeting = config.greetingAfternoon || 'Good afternoon! Zentrix accounts, Neha speaking. Kaise help kar sakti hoon?';
        else baseGreeting = config.greetingEvening || 'Good evening! Zentrix accounts, Neha. Finance related koi sawaal hai?';

        if (callerName && callerName !== 'Unknown') {
            baseGreeting = baseGreeting.replace('Zentrix accounts', `${callerName.split(' ')[0]} ji, Zentrix accounts`);
        }

        if (channel === 'whatsapp') {
            baseGreeting += ' Aap kya janna chahte hain?';
        }

        return baseGreeting;
    }
}

const nehaPersonaEngine = new NehaPersonaEngine();
export default nehaPersonaEngine;
