import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { RohanContext, ConversationState } from '@zentrix/types';

export class PostgresMemory {
    async loadLead(tenantId: any, leadId: string): Promise<RohanContext['lead'] | null> {
        try {
            const { rows } = await pool.query(
                `SELECT id, name, phone, email, status, source, project_id,
                        budget, ai_score, notes
                 FROM leads
                 WHERE id = $1 AND tenant_id = $2::uuid`,
                [leadId, tenantId]
            );
            return rows[0] || null;
        } catch (err: any) {
            logger.warn(`[PostgresMemory] Lead load failed for ${leadId}: ${err.message}`);
            return null;
        }
    }

    async loadProjectForLead(tenantId: any, leadId: string): Promise<RohanContext['project'] | null> {
        try {
            const { rows } = await pool.query(
                `SELECT p.id, p.name, p.location, p.price_range AS "priceRange",
                        p.amenities, p.description, p.available_units AS "availableUnits"
                 FROM projects p
                 INNER JOIN leads l ON l.project_id = p.id
                 WHERE l.id = $1 AND p.tenant_id = $2::uuid`,
                [leadId, tenantId]
            );
            return rows[0] || null;
        } catch (err: any) {
            logger.warn(`[PostgresMemory] Project load failed for lead ${leadId}: ${err.message}`);
            return null;
        }
    }

    async loadRecentInteractions(tenantId: number, leadId: string, limit: number): Promise<RohanContext['recent_interactions']> {
        try {
            const { rows } = await pool.query(
                `SELECT id, type, note, outcome, created_at
                 FROM interactions
                 WHERE lead_id = $1 AND tenant_id = $2
                 ORDER BY created_at DESC
                 LIMIT $3`,
                [leadId, tenantId, limit]
            );
            return rows;
        } catch (err: any) {
            logger.warn(`[PostgresMemory] Interactions load failed for ${leadId}: ${err.message}`);
            return [];
        }
    }

    async loadStateFromPG(tenantId: number, leadId: string): Promise<ConversationState | null> {
        try {
            const { rows } = await pool.query(
                `SELECT conversation_state FROM ai_conversation_memory
                 WHERE tenant_id = $1 AND lead_id = $2
                 ORDER BY updated_at DESC LIMIT 1`,
                [tenantId, leadId]
            );
            return rows[0]?.conversation_state || null;
        } catch (err: any) {
            logger.warn(`[PostgresMemory] PG state load failed: ${err.message}`);
            return null;
        }
    }

    async persistStateToPG(tenantId: number, leadId: string, state: ConversationState, memoryId?: string): Promise<void> {
        try {
            if (memoryId) {
                await pool.query(
                    `UPDATE ai_conversation_memory
                     SET conversation_state = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [state, memoryId]
                  );
            } else {
                const { rows } = await pool.query(
                    `SELECT id FROM ai_conversation_memory
                     WHERE tenant_id = $1 AND lead_id = $2
                     ORDER BY updated_at DESC LIMIT 1`,
                    [tenantId, leadId]
                );

                if (rows.length > 0) {
                     await pool.query(
                        `UPDATE ai_conversation_memory
                         SET conversation_state = $1, updated_at = NOW()
                         WHERE id = $2`,
                        [state, rows[0].id]
                    );
                }
            }
        } catch (err: any) {
            logger.warn(`[PostgresMemory] PG state persist failed: ${err.message}`);
            throw err;
        }
    }

    async loadProjectBattleCard(tenantId: any, projectName: string): Promise<RohanContext['battle_card'] | null> {
        try {
            const { rows } = await pool.query(
                `SELECT id, project_name AS "projectName", usp, objections
                 FROM project_battle_cards
                 WHERE tenant_id = $1::uuid AND LOWER(project_name) = LOWER($2) AND is_active = TRUE
                 LIMIT 1`,
                [tenantId, projectName]
            );
            return rows[0] || null;
        } catch (err: any) {
            logger.warn(`[PostgresMemory] Battle card load failed for project ${projectName}: ${err.message}`);
            return null;
        }
    }
}
