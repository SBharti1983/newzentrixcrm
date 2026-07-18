/**
 * NehaReasoning — Track B reasoning executor for the AI Accountant (Neha).
 *
 * Mirrors MonikaReasoning: builds the reasoning system prompt from the Neha
 * persona engine, routes the request through ModelRouter (reasoning track),
 * and returns a normalized AccountantReasoningOutput JSON.
 *
 * The reasoning output drives:
 *  - Filing decisions (GST/ITR) and document collection
 *  - CRM updates (lead tags, notes)
 *  - Handoff to Surendra (human manager) when context or caller requests it
 */

import { ModelRouter } from '../../ai/routing/ModelRouter';
import {
    DbAIEmployeePersona,
    NehaContext,
    AccountantReasoningOutput,
} from '@zentrix/types';
import nehaPersonaEngine from '../../employees/Neha/Persona';

export async function executeNehaReasoning(
    persona: DbAIEmployeePersona,
    context: NehaContext,
    userMessage: string
): Promise<AccountantReasoningOutput> {
    const reasoningPrompt = nehaPersonaEngine.buildSystemPrompt(persona, context, 'reasoning');

    const reasoningRaw = await ModelRouter.generateResponse(
        `System Prompt:\n${reasoningPrompt}\n\nCaller Message: ${userMessage}\n\nGenerate structured analysis JSON:`,
        true,
        'reasoning'
    );

    return normalizeNehaReasoning(reasoningRaw);
}

/**
 * Normalize the raw LLM JSON into a valid AccountantReasoningOutput,
 * filling defaults for any missing fields so downstream code is safe.
 */
export function normalizeNehaReasoning(raw: any): AccountantReasoningOutput {
    return {
        intent: raw.intent || 'general_query',
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
