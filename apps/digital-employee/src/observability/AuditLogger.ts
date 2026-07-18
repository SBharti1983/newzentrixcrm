import { pool } from '@zentrix/database';
import { Logger } from './Logger';

export interface AuditLogPayload {
    action: string;
    tenantId?: string;
    userId?: string;
    userEmail?: string;
    targetId?: string;
    resource?: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditLogger {
    static async log(payload: AuditLogPayload): Promise<void> {
        try {
            const query = `
                INSERT INTO audit_logs (
                    action, tenant_id, user_id, user_email, target_id, 
                    resource, resource_id, details, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;
            const params = [
                payload.action,
                payload.tenantId || null,
                payload.userId || null,
                payload.userEmail || null,
                payload.targetId || null,
                payload.resource || null,
                payload.resourceId || null,
                payload.details ? JSON.stringify(payload.details) : '{}',
                payload.ipAddress || null,
                payload.userAgent || null
            ];

            await pool.query(query, params);
            Logger.info(`[AuditLogger] Logged action: ${payload.action}`, { 
                action: payload.action, 
                targetId: payload.targetId 
            });
        } catch (error) {
            Logger.error('[AuditLogger] Failed to write audit log to database', { 
                error: error instanceof Error ? error.message : String(error), 
                payload 
            });
        }
    }
}
