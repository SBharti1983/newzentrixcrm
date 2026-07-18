/**
 * Telephony Domain API Contracts
 */

export interface LogCallRequest {
    tenantId: string;
    callId: string;
    leadId: string;
    durationSeconds: number;
    recordingUrl?: string;
    transcript?: string;
    outcome?: 'answered' | 'no-answer' | 'busy' | 'escalated';
}

export interface LogCallResponse {
    success: boolean;
    callId: string;
    processed: boolean;
}
