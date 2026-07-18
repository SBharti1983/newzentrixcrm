import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';

export class LeadQueue {
    /**
     * Fetches a batch of pending leads for concurrent dialing.
     * Implements specifications:
     * - owner = 'ROHAN_AI' (Mapped to assigned_to = rohanUserId)
     * - status = 'PENDING' (Mapped to PENDING, new, followup, or Active status)
     * - ORDER BY priority DESC (Mapped to priority classification sorting)
     */
    async fetchLeadBatch(
        rohanUserId: string, 
        tenantId: string, 
        excludedLeadIds: string[],
        limit: number
    ): Promise<Array<{ id: string; name: string; phone: string; tenant_id: string }>> {
        try {
            if (limit <= 0) return [];

            let query = `
                SELECT l.id, l.name, l.phone, l.tenant_id, l.priority, l.status
                FROM leads l
                LEFT JOIN interactions i ON i.lead_id = l.id AND i.type = 'Call' AND i.date >= CURRENT_DATE
                WHERE (l.assigned_to = $1)
                  AND l.tenant_id = $2
                  AND (l.status = 'PENDING' OR l.status IN (
                      'new', 'followup', 'Active', 'active',
                      'nurture', 'contacted', 'qualified',
                      'follow_up_required', 'site_visit_scheduled'
                  ))
                  AND i.id IS NULL
            `;
            
            const params: any[] = [rohanUserId, tenantId];

            if (excludedLeadIds.length > 0) {
                params.push(excludedLeadIds);
                query += ` AND l.id != ALL($3)`;
            }

            query += `
                ORDER BY 
                  CASE 
                    WHEN LOWER(l.priority) = 'high' THEN 3
                    WHEN LOWER(l.priority) = 'medium' THEN 2
                    ELSE 1 
                  END DESC,
                  l.created_at ASC
                LIMIT $${params.length + 1}
            `;
            params.push(limit);

            const { rows } = await pool.query(query, params);
            return rows || [];
        } catch (err: any) {
            logger.error(`[LeadQueue] Error fetching lead batch: ${err.message}`);
            return [];
        }
    }

    /**
     * Legacy single lead fetch (delegates to batch for backward compatibility)
     */
    async fetchNextLead(
        rohanUserId: string, 
        tenantId: string, 
        excludedLeadIds: string[]
    ): Promise<{ id: string; name: string; phone: string; tenant_id: string } | null> {
        const batch = await this.fetchLeadBatch(rohanUserId, tenantId, excludedLeadIds, 1);
        return batch[0] || null;
    }
}
