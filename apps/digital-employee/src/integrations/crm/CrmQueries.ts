import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';

export interface RawLeadRow {
    id: string;
    tenant_id: number;
    name: string;
    phone: string;
    email?: string;
    status: string;
    source?: string;
    project_id?: string;
    budget_min?: number;
    budget_max?: number;
    assigned_to?: string;
    notes?: string;
    tags?: string[];
    ai_score?: number;
    sentiment?: string;
    nurture_stage?: string;
    created_at: string;
    updated_at?: string;
}

export interface RawUserRow {
    id: string;
    name: string;
    telephony_agent_id?: string;
    phone?: string;
    role: string;
}

export class CrmQueries {
    /**
     * Retrieve full details of a lead from the database.
     */
    async getLead(tenantId: number, leadId: string): Promise<RawLeadRow | null> {
        try {
            const { rows } = await pool.query(
                `SELECT * FROM leads WHERE id = $1 AND tenant_id = $2`,
                [leadId, tenantId]
            );
            return (rows[0] as RawLeadRow) || null;
        } catch (err: any) {
            logger.error(`[CrmQueries] Failed to fetch lead ${leadId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Find an active human agent with a specific role for call escalation/handoff.
     */
    async findActiveAgentByRole(tenantId: number, role: string): Promise<RawUserRow | null> {
        try {
            const { rows } = await pool.query(
                `SELECT id, name, telephony_agent_id, phone, role
                 FROM users
                 WHERE tenant_id = $1 
                   AND role = $2
                   AND is_active = TRUE
                   AND (is_ai_employee IS NULL OR is_ai_employee = FALSE)
                 ORDER BY name LIMIT 1`,
                [tenantId, role]
            );
            return (rows[0] as RawUserRow) || null;
        } catch (err: any) {
            logger.error(`[CrmQueries] Failed to find active agent by role ${role}: ${err.message}`);
            return null;
        }
    }

    /**
     * Fallback lookup for active admins or sales managers in the tenant.
     */
    async findFallbackManager(tenantId: number): Promise<RawUserRow | null> {
        try {
            const { rows } = await pool.query(
                `SELECT id, name, telephony_agent_id, phone, role
                 FROM users
                 WHERE tenant_id = $1
                   AND role IN ('admin', 'sales_manager', 'superadmin')
                   AND is_active = TRUE
                   AND (is_ai_employee IS NULL OR is_ai_employee = FALSE)
                 ORDER BY name LIMIT 1`,
                [tenantId]
            );
            return (rows[0] as RawUserRow) || null;
        } catch (err: any) {
            logger.error(`[CrmQueries] Failed to find fallback manager: ${err.message}`);
            return null;
        }
    }
}

const crmQueries = new CrmQueries();
export default crmQueries;
