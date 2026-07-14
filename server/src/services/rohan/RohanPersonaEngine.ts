/**
 * RohanPersonaEngine — Identity, Tone, Knowledge & Escalation
 *
 * This service is responsible for:
 * 1. Loading the active AI persona for a tenant from PostgreSQL
 * 2. Building the system prompt that defines Rohan's identity
 * 3. Injecting knowledge context (projects, inventory, FAQs)
 * 4. Evaluating escalation rules against reasoning output
 * 5. Applying persona tone/voice settings to responses
 *
 * The persona is the "who" — the Cognitive Loop is the "how".
 */

import pool from '../../db/pool';
import { logger } from '../../utils/logger';
import {
    DbAIEmployeePersona,
    PersonaConfig,
    VoiceConfig,
    KnowledgeScope,
    EscalationRules,
    ReasoningOutput,
    EscalationType,
    RohanContext,
    SupportedLanguage,
    PersonaNotFoundError,
} from './rohan.types';

// ── In-memory persona cache (refreshed every 5 min) ─────────────────
interface PersonaCacheEntry {
    persona: DbAIEmployeePersona;
    cached_at: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const personaCache = new Map<number, PersonaCacheEntry>();

class RohanPersonaEngine {
    // ── Persona Loading ─────────────────────────────────────────────

    /**
     * Get the active AI persona for a tenant.
     * Uses in-memory cache to avoid repeated DB queries.
     */
    async getPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        // Check cache
        const cached = personaCache.get(tenantId);
        if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
            return cached.persona;
        }

        // Load from DB
        try {
            const { rows } = await pool.query(
                `SELECT * FROM ai_employee_personas
                 WHERE tenant_id = $1 AND is_active = TRUE
                 LIMIT 1`,
                [tenantId]
            );

            if (rows.length === 0) {
                throw new PersonaNotFoundError(tenantId);
            }

            const persona = rows[0] as DbAIEmployeePersona;

            // Update cache
            personaCache.set(tenantId, { persona, cached_at: Date.now() });

            return persona;
        } catch (err) {
            if (err instanceof PersonaNotFoundError) throw err;
            logger.error(`[RohanPersona] Failed to load persona for tenant ${tenantId}: ${err}`);
            throw new PersonaNotFoundError(tenantId);
        }
    }

    /**
     * Force-refresh the persona cache (call after admin updates persona config).
     */
    invalidateCache(tenantId: number): void {
        personaCache.delete(tenantId);
        logger.info(`[RohanPersona] Cache invalidated for tenant ${tenantId}`);
    }

    // ── System Prompt Builder ───────────────────────────────────────

    /**
     * Build the system prompt that defines Rohan's identity and behavior.
     * This prompt is sent to both Track A (fast) and Track B (reasoning).
     *
     * Track A gets a condensed version (for speed).
     * Track B gets the full version (for deep reasoning).
     */
    buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: RohanContext,
        track: 'fast' | 'reasoning'
    ): string {
        const config = persona.persona_config;
        const scope = persona.knowledge_scope;

        // ── Identity Block (shared by both tracks) ──
        const identityBlock = `
You are ${persona.employee_name}, a ${persona.role} at Zentrix Realty.
Your employee code is ${persona.employee_code}.

PERSONALITY: ${config.personality}
TONE: ${config.tone}
LANGUAGE STYLE: ${config.language_style}
PATIENCE: ${config.patience_level}

You are speaking to a real estate lead. You must:
- Be warm, professional, and genuinely helpful
- Use natural Hindi-English code-mix when the lead does (e.g., "Bhai, is project ka price kya hai?")
- Remember details from previous conversations
- Never make up facts — only use the provided project information
- ${scope.boundaries || 'Never commit to discounts or give legal advice'}
`;

        // ── Knowledge Block (shared, but condensed for fast track) ──
        const knowledgeBlock = this.buildKnowledgeBlock(context, track === 'fast');

        // ── Conversation Context Block ──
        const contextBlock = this.buildContextBlock(context);

        if (track === 'fast') {
            // Track A: Condensed prompt for speed (~200ms target)
            return `${identityBlock}

${knowledgeBlock}

${contextBlock}

Respond naturally and concisely. Match the lead's language. If unsure, ask a clarifying question. Keep responses under 3 sentences for voice, under 160 characters for WhatsApp.`;
        }

        // Track B: Full reasoning prompt with CoT instructions
        return `${identityBlock}

${knowledgeBlock}

${contextBlock}

You are the reasoning engine for ${persona.employee_name}. Analyze the lead's message and think step by step:

1. INTENT: What does the lead want right now?
2. EMOTION: What is their emotional state? (excited/interested/neutral/skeptical/anxious/frustrated/angry/confused)
3. EMOTION_SCORE: Rate from -1.0 (very negative) to 1.0 (very positive)
4. STAGE: Where are they in the buying journey? (awareness/interest/consideration/intent/evaluation/ready_to_book/nurture/cold)
5. MISSING_INFO: What critical information do we still need?
6. OBJECTION: Is this an objection? If yes, what type? (price/location/timing/trust/competition/financing/family_decision/not_interested/none)
7. ACTION: What should Rohan do? (respond/ask_question/schedule_visit/send_document/escalate_to_human/end_conversation)
8. RESPONSE: Draft Rohan's reply in the lead's preferred language
9. CRM_UPDATE: What should change in the lead record? (lead_score_delta, stage_change, sentiment, notes, next_followup_at, tags_to_add)
10. NEXT_GOAL: What is Rohan's goal for the next turn?
11. SHOULD_ESCALATE: Should this be escalated to a human? (true/false)
12. ESCALATION_TYPE: If escalating, what type? (discount_request/legal_question/negative_sentiment/booking_intent/confusion/max_duration_reached)

Return ONLY valid JSON with these exact keys:
{intent, emotion, emotion_score, stage, missing_info, objection, action, response, crm_update, next_goal, should_escalate, escalation_type}`;
    }

    // ── Knowledge Block Builder ────────────────────────────────────

    private buildKnowledgeBlock(context: RohanContext, condensed: boolean): string {
        const parts: string[] = ['KNOWLEDGE BASE:'];

        // Project information
        if (context.project) {
            const p = context.project;
            parts.push(`
PROJECT: ${p.name}
Location: ${p.location || 'N/A'}
Price Range: ${p.price_range_min ? '₹' + (p.price_range_min / 100000).toFixed(0) + 'L' : '?'} - ${p.price_range_max ? '₹' + (p.price_range_max / 100000).toFixed(0) + 'L' : '?'}
Available Units: ${p.available_units ?? 'Contact for details'}
Amenities: ${p.amenities?.join(', ') || 'Standard amenities'}
Description: ${condensed ? (p.description || '').substring(0, 200) : p.description || 'N/A'}`);
        } else {
            parts.push('PROJECT: No specific project assigned. Ask the lead about their preferences.');
        }

        // Lead information
        if (context.lead) {
            const l = context.lead;
            parts.push(`
LEAD PROFILE:
Name: ${l.name}
Phone: ${l.phone || 'N/A'}
Status: ${l.status}
Source: ${l.source || 'Unknown'}
Budget: ${l.budget_min ? '₹' + (l.budget_min / 100000).toFixed(0) + 'L' : '?'} - ${l.budget_max ? '₹' + (l.budget_max / 100000).toFixed(0) + 'L' : '?'}
Current Score: ${l.ai_score ?? 'Not scored'}
Sentiment: ${l.sentiment || 'Unknown'}
Nurture Stage: ${l.nurture_stage || 'N/A'}
Tags: ${l.tags?.join(', ') || 'None'}
Notes: ${condensed ? (l.notes || '').substring(0, 200) : l.notes || 'None'}`);
        }

        // Recent interaction history (condensed for fast track)
        if (context.recent_interactions.length > 0) {
            const interactions = condensed
                ? context.recent_interactions.slice(0, 3)
                : context.recent_interactions;
            parts.push(`
RECENT INTERACTIONS:
${interactions.map(i => `- [${i.type}] ${i.note?.substring(0, condensed ? 100 : 500)} (${i.outcome || 'N/A'})`).join('\n')}`);
        }

        // Previous reasoning (Track B's last output)
        if (context.last_reasoning) {
            parts.push(`
PREVIOUS REASONING (from last turn):
Intent: ${context.last_reasoning.intent}
Emotion: ${context.last_reasoning.emotion} (${context.last_reasoning.emotion_score})
Stage: ${context.last_reasoning.stage}
Next Goal: ${context.last_reasoning.next_goal}
Missing Info: ${context.last_reasoning.missing_info.join(', ')}`);
        }

        return parts.join('\n');
    }

    // ── Context Block Builder ───────────────────────────────────────

    private buildContextBlock(context: RohanContext): string {
        const state = context.conversation_state;
        return `
CONVERSATION STATE:
Turn: ${state.turn_count}
Language Detected: ${state.language_detected}
Current Goal: ${state.current_goal}
Emotion Trend: ${state.emotion_trend.join(' → ') || 'None yet'}
Missing Info: ${state.missing_info.join(', ') || 'None'}
Objections Raised: ${state.objections_raised.join(', ') || 'None'}
Documents Shared: ${state.documents_shared.join(', ') || 'None'}
Next Action: ${state.next_action}
${state.last_user_message ? `Last User Message: "${state.last_user_message}"` : ''}
${state.last_rohan_message ? `Last Rohan Message: "${state.last_rohan_message}"` : ''}`;
    }

    // ── Escalation Evaluation ───────────────────────────────────────

    /**
     * Evaluate whether the reasoning output triggers an escalation.
     * Returns the escalation type if escalation is needed, null otherwise.
     */
    evaluateEscalation(
        persona: DbAIEmployeePersona,
        reasoning: ReasoningOutput,
        context: RohanContext
    ): EscalationType | null {
        const rules = persona.escalation_rules;

        // 1. Explicit escalation from reasoning
        if (reasoning.should_escalate && reasoning.escalation_type) {
            return reasoning.escalation_type;
        }

        // 2. Negative sentiment threshold
        if (
            rules.negative_sentiment_below !== undefined &&
            reasoning.emotion_score < rules.negative_sentiment_below
        ) {
            return 'negative_sentiment';
        }

        // 3. Discount request objection
        if (
            reasoning.objection?.type === 'price' &&
            rules.discount_request
        ) {
            // Check if the user is explicitly asking for a discount
            const userMsg = (context.conversation_state.last_user_message || '').toLowerCase();
            if (userMsg.includes('discount') || userMsg.includes('kam') || userMsg.includes('less') || userMsg.includes('deal')) {
                return 'discount_request';
            }
        }

        // 4. Legal question detection
        if (rules.legal_question) {
            const userMsg = (context.conversation_state.last_user_message || '').toLowerCase();
            const legalKeywords = ['legal', 'rera', 'court', 'lawsuit', 'dispute', 'title', 'ownership'];
            if (legalKeywords.some(kw => userMsg.includes(kw))) {
                return 'legal_question';
            }
        }

        // 5. Booking intent
        if (
            reasoning.action === 'schedule_visit' &&
            reasoning.stage === 'ready_to_book' &&
            rules.booking_intent
        ) {
            return 'booking_intent';
        }

        // 6. Max conversation duration
        if (rules.max_conversation_minutes) {
            const startedAt = new Date(context.conversation_state.conversation_started_at);
            const elapsedMin = (Date.now() - startedAt.getTime()) / 60000;
            if (elapsedMin >= rules.max_conversation_minutes) {
                return 'max_duration_reached';
            }
        }

        return null;
    }

    /**
     * Get the escalation action and target role for a given escalation type.
     */
    getEscalationAction(
        persona: DbAIEmployeePersona,
        escalationType: EscalationType
    ): { action: string; role: string } | null {
        const rules = persona.escalation_rules;

        switch (escalationType) {
            case 'discount_request':
                return rules.discount_request
                    ? { action: rules.discount_request.action, role: rules.discount_request.role }
                    : null;
            case 'legal_question':
                return rules.legal_question
                    ? { action: rules.legal_question.action, role: rules.legal_question.role }
                    : null;
            case 'booking_intent':
                return rules.booking_intent
                    ? { action: rules.booking_intent.action, role: rules.booking_intent.role }
                    : null;
            case 'confusion':
                return rules.conversation_confusion
                    ? { action: rules.conversation_confusion.action, role: rules.conversation_confusion.role }
                    : null;
            case 'negative_sentiment':
                return { action: 'notify', role: 'sales_manager' };
            case 'max_duration_reached':
                return { action: 'warm_transfer', role: 'sales_manager' };
            default:
                return null;
        }
    }

    // ── Voice Configuration ─────────────────────────────────────────

    /**
     * Get the TTS voice ID for the detected language.
     */
    getVoiceForLanguage(
        persona: DbAIEmployeePersona,
        language: SupportedLanguage
    ): string {
        const voiceConfig = persona.voice_config;

        // Indian languages → Hindi voice as fallback
        const indianLangs: SupportedLanguage[] = ['hindi', 'tamil', 'telugu', 'kannada', 'marathi', 'bengali', 'gujarati', 'punjabi', 'malayalam', 'odia'];

        if (language === 'english') {
            return voiceConfig.english_voice;
        }

        if (language === 'hinglish' || indianLangs.includes(language)) {
            return voiceConfig.code_mix_voice || voiceConfig.hindi_voice;
        }

        // Default to Hindi voice
        return voiceConfig.hindi_voice;
    }

    /**
     * Get TTS parameters (speed, pitch) from persona config.
     */
    getTTSParams(persona: DbAIEmployeePersona): { speed: number; pitch: number } {
        return {
            speed: persona.voice_config.speed || 1.0,
            pitch: persona.voice_config.pitch || 1.0,
        };
    }

    // ── Filler Word Injection ────────────────────────────────────────

    /**
     * Get a random filler word for natural conversation flow.
     * Used during reasoning gaps to avoid dead air in voice calls.
     */
    getRandomFiller(persona: DbAIEmployeePersona): string | null {
        const fillers = persona.persona_config.filler_words;
        if (!fillers || fillers.length === 0) return null;
        return fillers[Math.floor(Math.random() * fillers.length)];
    }

    // ── Greeting Generator ───────────────────────────────────────────

    /**
     * Generate a personalized greeting for the first turn.
     */
    generateGreeting(
        persona: DbAIEmployeePersona,
        leadName: string,
        projectName?: string,
        channel: 'voice' | 'whatsapp' | 'outbound' = 'voice'
    ): string {
        const greetingStyle = persona.persona_config.greeting_style;

        let greeting = greetingStyle.replace('{name}', leadName.split(' ')[0]);

        if (projectName) {
            greeting += ` Aapne hamare ${projectName} ke baare mein interest dikhaya tha.`;
        }

        if (channel === 'outbound') {
            greeting += ` Kya aap abhi 2 minute baat kar sakte hain?`;
        } else if (channel === 'whatsapp') {
            greeting += ` Kaise help kar sakta hoon aapki?`;
        } else {
            greeting += ` Main aapki help kar sakta hoon. Aap kya janna chahte hain?`;
        }

        return greeting;
    }
}

// ── Singleton Export ─────────────────────────────────────────────────
const rohanPersonaEngine = new RohanPersonaEngine();
export default rohanPersonaEngine;
export { RohanPersonaEngine };
