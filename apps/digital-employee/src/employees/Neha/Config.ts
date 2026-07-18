import { AccountantHandoffTarget, AccountantReasoningOutput, AccountantRouting, NehaContext, StaffDirectoryEntry } from '@zentrix/types';

/**
 * Generates a natural-sounding handoff message Neha speaks to the caller
 * before initiating a warm transfer to Surendra (human manager).
 */
export function getNehaHandoffMessage(
    target: AccountantHandoffTarget,
    callerName: string,
    staffName?: string
): string {
    const firstName = callerName.split(' ')[0] || 'ji';
    const partyName = staffName || targetName(target);

    switch (target) {
        case 'surendra':
            return `Ji bilkul ${firstName} ji, main aapko apne Manager ${partyName} sir se connect kar rahi hoon. Woh aapki puri help karenge. Ek second hold karein please.`;
        case 'voicemail':
            return `${firstName} ji, Surendra sir abhi available nahi hain. Kya aap chahte hain ki main unhe aapka message pass karu? Ya phir aap baad mein wapas call karenge?`;
        default:
            return `${firstName} ji, ek second, main aapko apne team se connect kar rahi hoon.`;
    }
}

function targetName(target: AccountantHandoffTarget): string {
    switch (target) {
        case 'surendra': return 'Surendra';
        default: return 'hamari team';
    }
}

/**
 * Build a context brief for Surendra receiving the handoff.
 * Displayed on his CRM screen so he has full context before picking up.
 */
export function buildNehaHandoffBrief(
    reasoning: AccountantReasoningOutput,
    context: NehaContext,
    target: AccountantHandoffTarget,
    routing?: AccountantRouting | null
): {
    brief: string;
    caller_name: string;
    caller_phone: string;
    intent: string;
    emotion: string;
    query_summary: string;
    turn_count: number;
    handoff_reason: string;
} {
    const state = context.conversation_state;
    const reasonMap: Record<string, string> = {
        customer_request: 'Caller explicitly asked for the manager',
        context_based: 'Routed based on conversation context (legal/audit/complaint)',
        escalation_rule: 'Routed by escalation keyword rule',
        fallback: 'Fallback routing — no specific party matched',
    };

    // Routing reason comes from the separately-computed AccountantRouting
    // (produced by NehaPersonaEngine.evaluateRouting), not from the reasoning
    // output. Fall back to reasoning.handoff_reason if routing is absent.
    const reasonKey = routing?.reason || reasoning.handoff_reason || 'context_based';

    return {
        brief: reasoning.query_summary || 'Caller routed from accounts.',
        caller_name: context.caller?.name || 'Unknown',
        caller_phone: context.caller?.phone || 'Unknown',
        intent: reasoning.intent,
        emotion: reasoning.emotion || 'neutral',
        query_summary: reasoning.query_summary || '',
        turn_count: state.turn_count,
        handoff_reason: reasonMap[reasonKey] || 'Routed from accounts',
    };
}

/**
 * Maps an AccountantRouting decision to the generic routing shape that
 * CrmUpdater.triggerHandoff expects (mirrors Monika's approach).
 */
export function toGenericRouting(routing: AccountantRouting): any {
    return {
        target: routing.target,
        reason: routing.reason,
        brief: routing.brief,
        mode: routing.mode,
    };
}

/**
 * Resolves the human manager (Surendra) StaffDirectoryEntry from the
 * Neha context, used when posting the handoff alert.
 */
export function resolveManager(
    target: AccountantHandoffTarget,
    context: NehaContext
): StaffDirectoryEntry | null {
    if (target === 'voicemail') return null;
    return context.manager_directory.find(s => s.role === target) || null;
}
