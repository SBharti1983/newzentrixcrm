import { EscalationType, ReasoningOutput, RohanContext } from '@zentrix/types';

/**
 * Generates a natural-sounding handoff message when AI Rohan transfers
 * a call to a human manager. Used by the voice adapter to speak to the
 * customer before initiating the transfer.
 */
export function getHandoffMessage(
    escalationType: EscalationType,
    leadName: string,
    managerName: string = 'senior'
): string {
    const firstName = leadName.split(' ')[0] || 'ji';

    switch (escalationType) {
        case 'customer_requested_human':
            return `Ji bilkul ${firstName} ji, main abhi aapko apne ${managerName} sir se connect karta hoon. Ek second hold karein please.`;
        case 'discount_request':
            return `${firstName} ji, pricing discussion ke liye main aapko ${managerName} sir se baat kara raha hoon jo aapko best deal de sakenge. Ek moment please.`;
        case 'booking_intent':
            return `Bahut accha ${firstName} ji! Booking ke liye main aapko ${managerName} sir se connect karta hoon jo formalities handle karenge. Hold please.`;
        case 'negative_sentiment':
            return `Main samajh raha hoon ${firstName} ji. Main aapko apne ${managerName} sir se baat kara raha hoon taaki aapki concern properly address ho sake.`;
        case 'legal_question':
            return `${firstName} ji, legal matters ke liye main aapko hamare expert se connect kar raha hoon. Ek second please.`;
        case 'confusion':
            return `${firstName} ji, aapki query ko better handle karne ke liye main aapko apne ${managerName} sir se connect karta hoon.`;
        case 'max_duration_reached':
            return `${firstName} ji, aapki baat important hai. Main aapko apne ${managerName} sir se connect karta hoon taaki woh aapki puri help kar sakein.`;
        default:
            return `${firstName} ji, ek second, main aapko apne team se connect kar raha hoon.`;
    }
}

/**
 * Builds a short context brief for the human manager receiving the transfer.
 * This is displayed on their CRM screen so they have full context before picking up.
 */
export function buildContextBrief(
    reasoning: ReasoningOutput,
    context: RohanContext,
    escalationType: EscalationType
): {
    brief: string;
    lead_stage: string;
    emotion: string;
    objection: string | null;
    escalation_reason: string;
    turn_count: number;
    key_topics: string[];
} {
    const state = context.conversation_state;
    const objText = reasoning.objection?.text || reasoning.objection?.type || null;

    // Build a concise brief from the conversation state
    const parts: string[] = [];
    if (state.current_goal) parts.push(`Current goal: ${state.current_goal}`);
    if (objText) parts.push(`Objection raised: ${objText}`);
    if (Array.isArray(state.missing_info) && state.missing_info.length > 0) parts.push(`Missing info: ${state.missing_info.join(', ')}`);
    if (reasoning.emotion) parts.push(`Customer mood: ${reasoning.emotion}`);
    if (state.next_action) parts.push(`AI was about to: ${state.next_action}`);

    const reasonMap: Record<string, string> = {
        customer_requested_human: 'Customer explicitly asked to speak to a human/manager',
        discount_request: 'Customer asked for a discount — AI cannot commit pricing changes',
        booking_intent: 'Customer is ready to book — needs human for formalities',
        negative_sentiment: 'Customer sentiment dropped below threshold — needs empathy',
        legal_question: 'Customer asked a legal/RERA question — needs expert',
        confusion: 'Conversation stuck in a loop — AI could not resolve',
        max_duration_reached: 'Call duration exceeded the configured maximum',
    };

    return {
        brief: parts.join('. ') || 'No detailed context available.',
        lead_stage: reasoning.stage || state.current_goal || 'unknown',
        emotion: reasoning.emotion || 'neutral',
        objection: objText,
        escalation_reason: reasonMap[escalationType] || escalationType,
        turn_count: state.turn_count,
        key_topics: Array.isArray(state.objections_raised) ? state.objections_raised : [],
    };
}
