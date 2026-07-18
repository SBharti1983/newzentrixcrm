/**
 * SessionState
 * Manages conversation session parameters, including turn-count, active channel, and workflow flags.
 */
export interface SessionState {
    sessionId: string;
    tenantId: number;
    channel: 'voice' | 'whatsapp' | 'web';
    currentWorkflowId?: string;
    turnsCount: number;
    startedAt: Date;
    lastActiveAt: Date;
}

export function createDefaultSessionState(tenantId: number, sessionId: string, channel: 'voice' | 'whatsapp' | 'web'): SessionState {
    return {
        sessionId,
        tenantId,
        channel,
        turnsCount: 0,
        startedAt: new Date(),
        lastActiveAt: new Date()
    };
}
