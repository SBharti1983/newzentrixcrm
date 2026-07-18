import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { DbAIEmployeePersona, EscalationType, ReasoningOutput, RohanContext } from '@zentrix/types';
import axios from 'axios';
import { buildContextBrief } from '../../employees/Rohan/Config';
import crmQueries from './CrmQueries';
import { CrmMapper } from './CrmMapper';

export class CrmUpdater {
    /**
     * Applies AI insights directly to CRM leads.
     */
    async applyCRMUpdates(
        tenantId: number,
        leadId: string,
        update: any
    ): Promise<void> {
        try {
            logger.info(`[CrmUpdater] Applying CRM updates for lead ${leadId}:`, update);

            const updates: string[] = [];
            const values: any[] = [];
            let placeholderCount = 1;

            if (update.stage_change) {
                updates.push(`status = $${placeholderCount++}`);
                values.push(update.stage_change);
                updates.push(`nurture_stage = $${placeholderCount++}`);
                values.push(update.stage_change);
            }

            if (update.sentiment) {
                updates.push(`sentiment = $${placeholderCount++}`);
                values.push(update.sentiment);
            }

            if (update.lead_score_delta) {
                updates.push(`ai_score = COALESCE(ai_score, 0) + $${placeholderCount++}`);
                values.push(update.lead_score_delta);
            }

            if (update.notes) {
                updates.push(`notes = CONCAT(COALESCE(notes, ''), '\n', $${placeholderCount++})`);
                values.push(`[Rohan AI]: ${update.notes}`);
            }

            if (updates.length > 0) {
                values.push(leadId, tenantId);
                const query = `UPDATE leads 
                               SET ${updates.join(', ')}, updated_at = NOW() 
                               WHERE id = $${placeholderCount++} AND tenant_id = $${placeholderCount++}`;
                await pool.query(query, values);
            }
        } catch (err: any) {
            logger.error(`[CrmUpdater] Failed to apply CRM updates: ${err.message}`);
        }
    }

    /**
     * Triggers CRM Automations based on action intents.
     */
    async triggerAutomation(
        tenantId: number,
        leadId: string,
        action: string,
        objection: any,
        notes: string
    ): Promise<void> {
        try {
            const crmApiUrl = process.env.CRM_API_URL || 'http://localhost:4000';
            const expectedSecret = process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me';
            await axios.post(`${crmApiUrl}/api/v1/ai/dashboard/automation-trigger`, {
                tenant_id: tenantId,
                lead_id: leadId,
                action,
                objection,
                notes,
                secret: expectedSecret
            });
            logger.info(`[CrmUpdater] Posted automation-trigger: ${action}`);
        } catch (err: any) {
            logger.error(`[CrmUpdater] Failed to trigger CRM automation workflow: ${err.message}`);
        }
    }

    /**
     * Records an escalation event in the database and dispatches signaling to the CRM API.
     */
    async triggerEscalation(
        tenantId: number,
        persona: DbAIEmployeePersona,
        leadId: string | undefined,
        memoryId: string,
        type: EscalationType,
        reasoning: ReasoningOutput,
        context: RohanContext,
        escalationAction: any
    ): Promise<void> {
        try {
            logger.info(`🚨 [CrmUpdater] Escalation triggered for tenant ${tenantId}, lead ${leadId}: ${type}`);

            // Insert escalation event
            await pool.query(
                `INSERT INTO ai_escalation_events 
                    (tenant_id, persona_id, lead_id, memory_id, escalation_type, trigger_reason, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [tenantId, persona.id, leadId || null, memoryId, type, reasoning.objection?.text || `Triggered by ${type} rules`, 'pending']
            );

            // Find the right human agent to transfer to
            let rawManager = await crmQueries.findActiveAgentByRole(tenantId, escalationAction?.role || 'sales_manager');
            if (!rawManager) {
                // Fallback to any active manager/admin
                rawManager = await crmQueries.findFallbackManager(tenantId);
            }

            const targetManager = rawManager ? CrmMapper.toDomainUser(rawManager) : null;

            if (targetManager) {
                const brief = buildContextBrief(reasoning, context, type);

                // Send escalation-alert to CRM API
                const crmApiUrl = process.env.CRM_API_URL || 'http://localhost:4000';
                await axios.post(`${crmApiUrl}/api/v1/ai/dashboard/escalation-alert`, {
                    tenant_id: tenantId,
                    lead_id: leadId,
                    manager_id: targetManager.id,
                    manager_agent_id: targetManager.telephonyAgentId,
                    escalation_type: type,
                    context_summary: brief,
                    action: escalationAction?.action || 'notify',
                });

                logger.info(`[CrmUpdater] Handoff alert posted to manager ${targetManager.name} (${targetManager.id})`);
            } else {
                logger.warn(`[CrmUpdater] No active human manager found to escalate to in tenant ${tenantId}`);
            }
        } catch (err: any) {
            logger.error(`[CrmUpdater] Failed to record/process escalation event: ${err.message}`);
        }
    }

    /**
     * Executes a receptionist handoff: record routing event, and post the handoff alert to CRM API.
     */
    async triggerHandoff(
        tenantId: number,
        persona: DbAIEmployeePersona,
        leadId: string | undefined,
        memoryId: string,
        routing: any,
        reasoning: any,
        context: any,
        target: any,
        brief: any,
        handoffMessage: string
    ): Promise<void> {
        try {
            logger.info(`🚨 [CrmUpdater] Handoff → ${routing.target} (reason: ${routing.reason}) for tenant ${tenantId}`);

            // Record the routing event in the escalation table
            await pool.query(
                `INSERT INTO ai_escalation_events
                    (tenant_id, persona_id, lead_id, memory_id, escalation_type, trigger_reason, status, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
                [
                    tenantId,
                    persona.id,
                    leadId || null,
                    memoryId,
                    `route_to_${routing.target}`,
                    routing.reason,
                    JSON.stringify({ routing, brief: routing.brief }),
                ]
            );

            // Dispatch handoff alert to CRM API
            const crmApiUrl = process.env.CRM_API_URL || 'http://localhost:4000';
            await axios.post(`${crmApiUrl}/api/v1/ai/dashboard/escalation-alert`, {
                tenant_id: tenantId,
                lead_id: leadId,
                manager_id: target?.user_id,
                manager_agent_id: target?.telephony_agent_id || target?.persona_id,
                escalation_type: `route_to_${routing.target}`,
                context_summary: brief.brief,
                action: routing.mode,
                handoff_message: handoffMessage,
                brief,
            });

            logger.info(`[CrmUpdater] Handoff alert posted to ${routing.target} (${target?.name || 'unknown'})`);
        } catch (err: any) {
            logger.error(`[CrmUpdater] Handoff failed: ${err.message}`);
        }
    }
}

const crmUpdater = new CrmUpdater();
export default crmUpdater;
