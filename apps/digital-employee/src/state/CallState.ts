/**
 * CallState
 * Telephony VoIP session variables (e.g. SIP agent, silence count, active Barge-in flag, ASR timings).
 */
export interface CallState {
    callSid: string;
    telephonyProvider: string;
    isActive: boolean;
    isMuted: boolean;
    bargeInDetected: boolean;
    speechStartTimestamp?: number;
    durationSeconds: number;
}

export function createDefaultCallState(callSid: string, provider: string): CallState {
    return {
        callSid,
        telephonyProvider: provider,
        isActive: true,
        isMuted: false,
        bargeInDetected: false,
        durationSeconds: 0
    };
}
