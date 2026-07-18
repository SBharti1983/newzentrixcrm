/**
 * Security audit trailing models
 */

export interface SecurityAuditEvent {
    tenantId: string;
    userId?: string;
    userIp?: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: 'success' | 'failure';
    reason?: string;
    metadata?: Record<string, any>;
    timestamp: string;
}

/**
 * Utility helper to build standard security audit events
 */
export function buildAuditEvent(params: Omit<SecurityAuditEvent, 'timestamp'>): SecurityAuditEvent {
    return {
        ...params,
        timestamp: new Date().toISOString()
    };
}
