/**
 * RohanPersonaEngine — Identity, Tone, Knowledge & Escalation
 *
 * Extends BasePersonaEngine (item 2.1) so the shared persona loading,
 * caching, voice, and filler logic is inherited. This class keeps only
 * the Rohan-specific logic:
 *   - buildSystemPrompt()      — identity + knowledge + context + track blocks
 *   - evaluateEscalation()     — sales escalation rules
 *   - getEscalationAction()    — escalation → action/role mapping
 *   - generateGreeting()       — sales greeting with project + channel variants
 *
 * NOTE: This module runs inside apps/digital-employee — isolated from CRM API traffic.
 */

import {
    DbAIEmployeePersona,
    ReasoningOutput,
    EscalationType,
    RohanContext,
} from '@zentrix/types';
import { loadPrompt } from '../../utils/prompts';
import { BasePersonaEngine } from '../BasePersonaEngine';

export class RohanPersonaEngine extends BasePersonaEngine {
    protected readonly role = 'rohan' as const;
    protected readonly logTag = '[RohanPersona]';

    // ── System Prompt Builder ───────────────────────────────────────

    buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: RohanContext,
        track: 'fast' | 'reasoning'
    ): string {
        const config = persona.persona_config;
        const scope = persona.knowledge_scope;

        // Load and compile identity template
        const rawIdentity = loadPrompt('sales', 'rohan_identity.txt');
        const identityBlock = rawIdentity
            .replace('{employee_name}', persona.employee_name)
            .replace('{role}', persona.role)
            .replace('{employee_code}', persona.employee_code)
            .replace('{personality}', config.personality)
            .replace('{tone}', config.tone)
            .replace('{language_style}', config.language_style)
            .replace('{patience_level}', config.patience_level)
            .replace('{boundaries}', scope.boundaries || 'Never commit to discounts or give legal advice');

        const knowledgeBlock = this.buildKnowledgeBlock(context, track === 'fast');
        const contextBlock = this.buildContextBlock(context);

        if (track === 'fast') {
            const rawFast = loadPrompt('sales', 'rohan_fast.txt');
            return `${identityBlock}

${knowledgeBlock}

${contextBlock}

${rawFast}`;
        }

        const rawReasoning = loadPrompt('sales', 'rohan_reasoning.txt');
        const reasoningBlock = rawReasoning.replace('{employee_name}', persona.employee_name);

        return `${identityBlock}

${knowledgeBlock}

${contextBlock}

${reasoningBlock}`;
    }

    private getPhaseGuidelines(phase: string): string {
        const p = (phase || 'greeting').toLowerCase();
        if (p.includes('greeting')) {
            return 'PHASE: GREETING. Goal: Warmly greet the caller, build rapport, and confirm their identity.';
        }
        if (p.includes('discovery')) {
            return 'PHASE: DISCOVERY. Goal: Ask open questions to understand their budget, size/BHK preference, and location preferences.';
        }
        if (p.includes('presentation')) {
            return 'PHASE: PRESENTATION. Goal: Pitch the assigned project using its USPs, amenities, and value. Keep interest high.';
        }
        if (p.includes('objection_handling') || p.includes('objections')) {
            return 'PHASE: OBJECTION HANDLING. Goal: Address their concerns using the project battle card playbook strategies. Never sound argumentative.';
        }
        if (p.includes('close')) {
            return 'PHASE: CLOSE. Goal: Proactively prompt the lead to schedule a physical site visit.';
        }
        return `PHASE: ${phase.toUpperCase()}. Goal: Guide the lead toward booking a site visit.`;
    }

    private buildKnowledgeBlock(context: RohanContext, condensed: boolean): string {
        const parts: string[] = ['KNOWLEDGE BASE:'];

        if (context.project) {
            const p = context.project;
            parts.push(`
PROJECT: ${p.name}
Location: ${p.location || 'N/A'}
Price Range: ${p.priceRange || 'N/A'}
Available Units: ${p.availableUnits ?? 'Contact for details'}
Amenities: ${p.amenities?.join(', ') || 'Standard amenities'}
Description: ${condensed ? (p.description || '').substring(0, 200) : p.description || 'N/A'}`);
        } else {
            parts.push('PROJECT: No specific project assigned. Ask the lead about their preferences.');
        }

        if (context.battle_card) {
            const b = context.battle_card;
            const objectionsList = b.objections && Array.isArray(b.objections)
                ? b.objections.map((o: any) => `- [${o.type}]: Strategy is "${o.strategy}" (When customer says: "${o.text}")`).join('\n')
                : 'None';
            parts.push(`
PROJECT BATTLE CARD & OBJECTION PLAYBOOK:
USPs: ${b.usp?.join(', ') || 'None'}
Playbooks (Objection -> Strategy):
${objectionsList}`);
        }

        if (context.lead) {
            const l = context.lead;
            parts.push(`
LEAD PROFILE:
Name: ${l.name}
Phone: ${l.phone || 'N/A'}
Status: ${l.status}
Source: ${l.source || 'Unknown'}
Budget: ${l.budget || 'N/A'}
Current Score: ${l.ai_score ?? 'Not scored'}
Sentiment: ${l.sentiment || 'Unknown'}
Nurture Stage: ${l.nurture_stage || 'N/A'}
Tags: ${l.tags?.join(', ') || 'None'}
Notes: ${condensed ? (l.notes || '').substring(0, 200) : l.notes || 'None'}`);
        }

        if (context.recent_interactions.length > 0) {
            const interactions = condensed
                ? context.recent_interactions.slice(0, 3)
                : context.recent_interactions;
            parts.push(`
RECENT INTERACTIONS:
${interactions.map(i => `- [${i.type}] ${i.note?.substring(0, condensed ? 100 : 500)} (${i.outcome || 'N/A'})`).join('\n')}`);
        }

        if (context.last_reasoning) {
            parts.push(`
PREVIOUS REASONING (from last turn):
Intent: ${context.last_reasoning.intent}
Emotion: ${context.last_reasoning.emotion} (${context.last_reasoning.emotion_score})
Stage: ${context.last_reasoning.stage}
Next Goal: ${context.last_reasoning.next_goal}
Missing Info: ${Array.isArray(context.last_reasoning.missing_info) ? context.last_reasoning.missing_info.join(', ') : 'None'}`);
        }

        return parts.join('\n');
    }

    private buildContextBlock(context: RohanContext): string {
        const state = context.conversation_state;
        const phaseGuidelines = this.getPhaseGuidelines(state.current_goal || 'greeting');
        return `
CONVERSATION STATE:
Turn: ${state.turn_count}
Language Detected: ${state.language_detected}
Current Goal (Phase): ${state.current_goal || 'greeting'}
${phaseGuidelines}
Emotion Trend: ${Array.isArray(state.emotion_trend) ? state.emotion_trend.join(' → ') : 'None yet'}
Missing Info: ${Array.isArray(state.missing_info) ? state.missing_info.join(', ') : 'None'}
Objections Raised: ${Array.isArray(state.objections_raised) ? state.objections_raised.join(', ') : 'None'}
Documents Shared: ${Array.isArray(state.documents_shared) ? state.documents_shared.join(', ') : 'None'}
Next Action: ${state.next_action}
${state.last_user_message ? `Last User Message: "${state.last_user_message}"` : ''}
${state.last_rohan_message ? `Last Rohan Message: "${state.last_rohan_message}"` : ''}`;
    }

    // ── Escalation Rules Evaluator ───────────────────────────────────

    evaluateEscalation(
        persona: DbAIEmployeePersona,
        reasoning: ReasoningOutput,
        context: RohanContext
    ): EscalationType | null {
        const rules = persona.escalation_rules;

        if (reasoning.should_escalate && reasoning.escalation_type) {
            return reasoning.escalation_type;
        }

        if (
            rules.negative_sentiment_below !== undefined &&
            reasoning.emotion_score < rules.negative_sentiment_below
        ) {
            return 'negative_sentiment';
        }

        if (
            reasoning.objection?.type === 'price' &&
            rules.discount_request
        ) {
            const userMsg = (context.conversation_state.last_user_message || '').toLowerCase();
            if (userMsg.includes('discount') || userMsg.includes('kam') || userMsg.includes('less') || userMsg.includes('deal')) {
                return 'discount_request';
            }
        }

        if (rules.legal_question) {
            const userMsg = (context.conversation_state.last_user_message || '').toLowerCase();
            const legalKeywords = ['legal', 'rera', 'court', 'lawsuit', 'dispute', 'title', 'ownership'];
            if (legalKeywords.some(kw => userMsg.includes(kw))) {
                return 'legal_question';
            }
        }

        if (
            reasoning.action === 'schedule_visit' &&
            reasoning.stage === 'ready_to_book' &&
            rules.booking_intent
        ) {
            return 'booking_intent';
        }

        if (rules.max_conversation_minutes) {
            const startedAt = new Date(context.conversation_state.conversation_started_at);
            const elapsedMin = (Date.now() - startedAt.getTime()) / 60000;
            if (elapsedMin >= rules.max_conversation_minutes) {
                return 'max_duration_reached';
            }
        }

        return null;
    }

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

    // ── Greeting Generator ───────────────────────────────────────────

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

const rohanPersonaEngine = new RohanPersonaEngine();
export default rohanPersonaEngine;
