import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { HandoffTarget, MonikaContext, ReceptionistReasoningOutput, ReceptionistRouting, StaffDirectoryEntry } from '@zentrix/types';

/**
 * Generates a natural-sounding handoff message Monika speaks to the caller
 * before initiating a warm transfer. Distinct from Rohan's handoff —
 * Monika introduces the next party by name and role.
 */
export function getMonikaHandoffMessage(
    target: HandoffTarget,
    callerName: string,
    staffName?: string
): string {
    const firstName = callerName.split(' ')[0] || 'ji';
    const partyName = staffName || targetName(target);

    switch (target) {
        case 'surendra':
            return `Ji bilkul ${firstName} ji, main aapko apne Sales Manager ${partyName} sir se connect kar rahi hoon. Woh aapki puri help karenge. Ek second hold karein please.`;
        case 'rohan':
            return `${firstName} ji, project ki details ke liye main aapko hamare Sales Executive ${partyName} se connect kar rahi hoon. Woh aapko saari information denge. Ek moment please.`;
        case 'neha':
            return `${firstName} ji, payment aur accounts se related query ke liye main aapko hamari Accounts team ${partyName} se connect kar rahi hoon. Hold please.`;
        case 'voicemail':
            return `${firstName} ji, woh abhi available nahi hain. Kya aap chahte hain ki main unhe aapka message pass karu? Ya phir aap baad mein wapas call karenge?`;
        default:
            return `${firstName} ji, ek second, main aapko apne team se connect kar rahi hoon.`;
    }
}

function targetName(target: HandoffTarget): string {
    switch (target) {
        case 'surendra': return 'Surendra';
        case 'rohan': return 'Rohan';
        case 'neha': return 'Neha';
        default: return 'hamari team';
    }
}

/**
 * Build a context brief for the party receiving the handoff (Surendra/Rohan).
 * Displayed on their CRM screen so they have full context before picking up.
 */
export function buildMonikaHandoffBrief(
    reasoning: ReceptionistReasoningOutput,
    context: MonikaContext,
    target: HandoffTarget
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
        customer_request: 'Caller explicitly asked for this party',
        context_based: 'Routed based on conversation context',
        escalation_rule: 'Routed by escalation keyword rule',
        fallback: 'Fallback routing — no specific party matched',
    };

    return {
        brief: reasoning.query_summary || 'Caller routed from reception.',
        caller_name: context.caller?.name || 'Unknown',
        caller_phone: context.caller?.phone || 'Unknown',
        intent: reasoning.intent,
        emotion: reasoning.emotion || 'neutral',
        query_summary: reasoning.query_summary || '',
        turn_count: state.turn_count,
        handoff_reason: reasonMap[reasoning.routing?.reason || 'context_based'] || 'Routed from reception',
    };
}
