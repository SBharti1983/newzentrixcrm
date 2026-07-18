/**
 * Event Contracts and Payload Schemas
 * 
 * Provides static type safety for all core CRM and voice event payloads.
 */

export interface LeadCreatedPayload {
    tenantId: number;
    leadId: string;
    name: string;
    phone: string;
    source: string;
    createdAt?: string;
}

export interface BookingConfirmedPayload {
    tenantId: number;
    bookingId: string;
    leadId: string;
    projectId: string;
    amount: number;
    confirmedAt?: string;
}

export interface CallEndedPayload {
    tenantId: number;
    callId: string;
    leadId: string;
    durationSeconds: number;
    recordingUrl?: string;
    summary?: string;
    endedAt?: string;
}

export interface PaymentReceivedPayload {
    tenantId: number;
    paymentId: string;
    amount: number;
    status: string;
    receivedAt?: string;
}

export interface AIAgentStatusChangePayload {
    agentId: string;
    name: string;
    status: string;
    timestamp: number;
}

/**
 * Event naming mapping registry.
 * Maps event topic keys to their respective type-safe payloads.
 */
export type EventMap = {
    'lead:created': LeadCreatedPayload;
    'booking:confirmed': BookingConfirmedPayload;
    'call:ended': CallEndedPayload;
    'payment:received': PaymentReceivedPayload;
    'ai_agent:status_change': AIAgentStatusChangePayload;
};

