/**
 * RohanCognitiveLoop — Two-Track Cognitive Loop Orchestrator (Rohan / Sales)
 *
 * Now extends BaseCognitiveLoop (item 1.1). The shared Track A / Track B
 * orchestration — persona fetch, context load, state update, streaming
 * fast path (item 1.4), memory get/create, reasoning validation (4.1),
 * timeout + abort (1.3), repair retry (4.3), fallback reasoning parity
 * (1.2), state persistence, cache invalidation, and audit logging — all
 * live in BaseCognitiveLoop. This subclass implements only the Rohan-
 * specific hooks:
 *   - language-specific persona engine selection (Hinglish / English / Hindi)
 *   - Rohan reasoning executor + validator + normalizer + fallback
 *   - escalation triggers + CRM automation side effects
 *
 * NOTE: This module lives inside apps/digital-employee to run on a dedicated
 * Node.js event loop, isolated from the CRM API traffic in apps/api.
 */

import { logger } from '@zentrix/logger';
import rohanPersonaEngine from '../employees/Rohan/Persona';
import rohanEnglishPersona from '../employees/Rohan/EnglishPersona';
import rohanHindiPersona from '../employees/Rohan/HindiPersona';
import rohanMemory from '../memory/MemoryService';
import { executeRohanReasoning } from '../cognition/reasoning/RohanReasoning';
import crmUpdater from '../integrations/crm/CrmUpdater';
import { BaseCognitiveLoop, ReasoningValidationResult } from './BaseCognitiveLoop';
import {
    CognitiveInput,
    CognitiveResult,
    ReasoningOutput,
    ConversationState,
    RohanContext,
    EscalationType,
    SupportedLanguage,
    DbAIEmployeePersona,
} from '@zentrix/types';

/**
 * Pick the language-specific persona engine for Rohan (Hinglish default,
 * specialized English / Hindi variants). Used for both the fast prompt
 * and the reasoning prompt.
 */
function pickRohanEngine(language: SupportedLanguage) {
    if (language === 'english') return rohanEnglishPersona;
    if (language === 'hindi') return rohanHindiPersona;
    return rohanPersonaEngine;
}

class RohanCognitiveLoop extends BaseCognitiveLoop<
    CognitiveInput,
    RohanContext,
    CognitiveResult,
    ReasoningOutput
> {
    protected readonly logTag = '[RohanCognitiveLoop]';

    // ── Hooks ────────────────────────────────────────────────────────

    protected fetchPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        return rohanPersonaEngine.getPersona(tenantId);
    }

    protected async loadContext(
        input: CognitiveInput,
        persona: DbAIEmployeePersona
    ): Promise<RohanContext> {
        const { tenant_id, lead_id, channel, user_message } = input;
        return rohanMemory.loadContext(
            tenant_id,
            persona,
            lead_id || 'system-test-lead',
            channel,
            user_message
        );
    }

    protected buildFastPrompt(persona: DbAIEmployeePersona, context: RohanContext): string {
        const lang = context.conversation_state.language_detected || 'hinglish';
        const engine = pickRohanEngine(lang as SupportedLanguage);
        return engine.buildSystemPrompt(persona, context, 'fast');
    }

    protected async executeReasoning(
        persona: DbAIEmployeePersona,
        context: RohanContext,
        userMessage: string,
        _signal?: AbortSignal
    ): Promise<ReasoningOutput> {
        // executeRohanReasoning already selects the language-specific engine.
        return executeRohanReasoning(persona, context, userMessage);
    }

    /**
     * Validate required Rohan reasoning fields (item 4.1).
     * Required: intent, emotion, action, response, next_goal.
     */
    protected validateReasoningOutput(raw: any): ReasoningValidationResult {
        const missing: string[] = [];
        if (raw == null || typeof raw !== 'object') {
            return { valid: false, missing: ['<root>'] };
        }
        if (!raw.intent) missing.push('intent');
        if (!raw.emotion) missing.push('emotion');
        if (!raw.action) missing.push('action');
        if (typeof raw.response !== 'string') missing.push('response');
        if (!raw.next_goal) missing.push('next_goal');
        return { valid: missing.length === 0, missing };
    }

    /**
     * Normalize the raw reasoning into a valid ReasoningOutput, filling
     * defaults for missing optional fields (item 4.1, step 3). Mirrors the
     * shape Neha's normalizer already had.
     */
    protected normalizeReasoning(raw: any): ReasoningOutput {
        return {
            intent: raw.intent || 'unknown',
            emotion: raw.emotion || 'neutral',
            emotion_score: typeof raw.emotion_score === 'number' ? raw.emotion_score : 0,
            stage: raw.stage || (raw.context?.conversation_state?.current_goal) || 'awareness',
            missing_info: Array.isArray(raw.missing_info) ? raw.missing_info : [],
            objection: raw.objection || null,
            action: raw.action || 'respond',
            response: raw.response || '',
            crm_update: raw.crm_update || null,
            next_goal: raw.next_goal || 'qualify_and_engage',
            should_escalate: Boolean(raw.should_escalate),
            escalation_type: raw.escalation_type || null,
            turn_effectiveness: typeof raw.turn_effectiveness === 'number' ? raw.turn_effectiveness : null,
        };
    }

    /**
     * Fallback reasoning used when Track B fails or times out (item 1.2).
     * Matches the previous Rohan-specific fallback so behaviour is unchanged.
     */
    protected buildFallbackReasoning(context: RohanContext, cleanText: string): ReasoningOutput {
        return {
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
    }

    protected getMemoryKey(input: CognitiveInput): string {
        return input.lead_id || 'system-test-lead';
    }

    protected userMessageLabel(): string {
        return 'Lead Message';
    }

    protected employeeName(persona: DbAIEmployeePersona): string {
        return persona.employee_name || 'Rohan';
    }

    protected getFillerPrefix(persona: DbAIEmployeePersona): string | null {
        return rohanPersonaEngine.getRandomFiller(persona);
    }

    /**
     * Rohan-specific Track B side effects (item 1.1):
     *   - escalation triggers (discount / legal / negative sentiment ...)
     *   - CRM automations for send_document / schedule_visit actions
     */
    protected async applyReasoningSideEffects(
        input: CognitiveInput,
        persona: DbAIEmployeePersona,
        context: RohanContext,
        reasoning: ReasoningOutput,
        memoryId: string
    ): Promise<void> {
        const { tenant_id, lead_id } = input;

        // Escalation
        const escalationTriggered = rohanPersonaEngine.evaluateEscalation(persona, reasoning, context);
        if (escalationTriggered) {
            const escalationAction = rohanPersonaEngine.getEscalationAction(persona, escalationTriggered);
            await crmUpdater.triggerEscalation(
                tenant_id,
                persona,
                lead_id,
                memoryId,
                escalationTriggered as EscalationType,
                reasoning,
                context,
                escalationAction
            );
        }

        // CRM automations (send_document / schedule_visit) when enabled
        const pConfig = persona.persona_config as any;
        if (
            lead_id &&
            pConfig.automationsEnabled !== false &&
            (reasoning.action === 'send_document' || reasoning.action === 'schedule_visit')
        ) {
            await crmUpdater.triggerAutomation(
                tenant_id,
                lead_id,
                reasoning.action,
                reasoning.objection,
                reasoning.crm_update?.notes || ''
            );
        }
    }

    /**
     * Rohan applies CRM updates via the base hook, but the base default is
     * sufficient — no override needed. (Kept explicit for clarity.)
     */
}

const rohanCognitiveLoop = new RohanCognitiveLoop();
export default rohanCognitiveLoop;
export { RohanCognitiveLoop };
