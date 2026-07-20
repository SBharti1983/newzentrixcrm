import pool from '../../../db/pool';
import { sendWhatsappMessage } from '../../../utils/whatsapp';
import { logger } from '@zentrix/logger';

// Escalation types allowed by the ai_escalation_events.escalation_type CHECK.
const VALID_ESCALATION_TYPES = new Set([
    'discount',
    'legal',
    'negative_sentiment',
    'booking_intent',
    'confusion',
]);

// Maps a Track B reasoning action/emotion to a suggested human role.
function suggestRoleForEscalation(escalationType: string): string {
    switch (escalationType) {
        case 'discount':
            return 'sales_manager';
        case 'legal':
            return 'legal_team';
        case 'booking_intent':
            return 'booking_team';
        default:
            return 'sales_manager';
    }
}

class RohanAutomationEngine {
    /**
     * Executes structured CRM workflows triggered by Rohan's Track B reasoning loop.
     */
    async executeTrigger(payload: {
        tenant_id: number;
        lead_id: string;
        action: string;
        objection?: any;
        notes?: string;
        // Required for escalate_to_human — populated by the event subscriber
        // from the reasoning_complete event payload.
        persona_id?: string;
        escalation_type?: string;
        trigger_reason?: string;
        memory_id?: string;
        io?: any;
    }): Promise<{ success: boolean; message: string }> {
        const { tenant_id, lead_id, action, notes } = payload;
        logger.info(`[RohanAutomationEngine] Processing automation intent: ${action} for lead ${lead_id}`);

        try {
            // 1. Load lead details from PostgreSQL database
            const { rows: leads } = await pool.query(
                `SELECT id, name, phone, assigned_to 
                 FROM leads 
                 WHERE id = $1 AND tenant_id = $2`,
                [lead_id, tenant_id]
            );

            const lead = leads[0];
            if (!lead) {
                logger.warn(`[RohanAutomationEngine] Lead not found: ${lead_id}`);
                return { success: false, message: 'Lead not found' };
            }

            if (action === 'send_document') {
                const messageText = `*Maya Infratech*\n\nNamaste ${lead.name}! Main Rohan baat kar raha hu. Jaise humne call par baat ki, ye raha hamare premium project ka official brochure aur pricing plans PDF download link:\n👉 https://maya-infratech.in/brochures/sector-62.pdf\n\nIsse download karke ek baar check kar lijiye aur mujhe bataye kab site visit ka plan banayein. Thank you!`;

                // Send WhatsApp brochure text
                await sendWhatsappMessage(tenant_id, lead.phone, messageText);

                // Insert brochure sent interaction log
                await pool.query(
                    `INSERT INTO interactions (tenant_id, lead_id, type, date, note, outcome)
                     VALUES ($1, $2, 'WhatsApp', NOW(), $3, 'Sent Brochure')`,
                    [tenant_id, lead_id, `Rohan AI sent brochure PDF automatically.\nNotes: ${notes || ''}`]
                );

                return { success: true, message: 'Project brochure sent successfully via WhatsApp' };
            }

            if (action === 'schedule_visit') {
                const messageText = `*Maya Infratech*\n\nGreat news, ${lead.name}! Sunday ko site visit ka details main log kar raha hoon. Coordinate driver detail share kar diya jayega.\n\nVisit Confirmation & Ticket Link:\n👉 https://calendly.com/zentrix-realty/site-visit\n\nHope to see you soon! - Rohan`;

                // Send WhatsApp booking ticket link
                await sendWhatsappMessage(tenant_id, lead.phone, messageText);

                // Set up Sunday visit date (next Sunday at 11 AM)
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + ((7 - scheduledDate.getDay()) % 7 || 7));
                scheduledDate.setHours(11, 0, 0, 0);

                // Insert callback task in database
                await pool.query(
                    `INSERT INTO followups (tenant_id, lead_id, assigned_to, type, priority, scheduled_at, note)
                     VALUES ($1, $2, $3, 'Site Visit', 'High', $4, $5)`,
                    [tenant_id, lead_id, lead.assigned_to || null, scheduledDate, 'Rohan AI Auto-scheduled Sunday visit details']
                );

                // Insert interaction log
                await pool.query(
                    `INSERT INTO interactions (tenant_id, lead_id, type, date, note, outcome)
                     VALUES ($1, $2, 'WhatsApp', NOW(), $3, 'Site Visit Scheduled')`,
                    [tenant_id, lead_id, `Rohan AI automatically scheduled Sunday site visit task.\nNotes: ${notes || ''}`]
                );

                return { success: true, message: 'Sunday site visit scheduled and ticket link sent' };
            }

            if (action === 'escalate_to_human') {
                // Track B flagged a hard objection / negative sentiment / legal
                // question that Rohan cannot resolve autonomously. Record the
                // escalation in ai_escalation_events (the table the Rohan
                // dashboard queries) and fan out a real-time Socket.IO alert
                // so the sales team can pick up the lead.

                const personaId = payload.persona_id;
                if (!personaId) {
                    logger.warn(`[RohanAutomationEngine] escalate_to_human requires persona_id; skipping for lead ${lead_id}`);
                    return { success: false, message: 'persona_id is required for escalate_to_human' };
                }

                // Normalize the escalation type to one allowed by the schema.
                let escalationType = (payload.escalation_type || 'confusion').toLowerCase();
                if (!VALID_ESCALATION_TYPES.has(escalationType)) {
                    // Heuristic mapping from common Track B emotion/intent labels.
                    const reason = (payload.trigger_reason || notes || '').toLowerCase();
                    if (reason.includes('price') || reason.includes('discount')) escalationType = 'discount';
                    else if (reason.includes('legal') || reason.includes('rera') || reason.includes('compliance')) escalationType = 'legal';
                    else if (reason.includes('sentiment') || reason.includes('angry') || reason.includes('frustrat')) escalationType = 'negative_sentiment';
                    else if (reason.includes('book') || reason.includes('token')) escalationType = 'booking_intent';
                    else escalationType = 'confusion';
                }

                const triggerReason = payload.trigger_reason
                    || (payload.objection ? JSON.stringify(payload.objection) : 'Track B reasoning flagged a human handoff')
                    || 'Track B reasoning flagged a human handoff';
                const suggestedRole = suggestRoleForEscalation(escalationType);

                // 1. Persist the escalation event (dashboard reads from this table).
                const { rows: inserted } = await pool.query(
                    `INSERT INTO ai_escalation_events
                        (tenant_id, persona_id, lead_id, memory_id, escalation_type, trigger_reason, suggested_role, status, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
                     RETURNING id`,
                    [
                        tenant_id,
                        personaId,
                        lead_id || null,
                        payload.memory_id || null,
                        escalationType,
                        triggerReason,
                        suggestedRole,
                        JSON.stringify({ source: 'track_b_reasoning', notes: notes || '', objection: payload.objection || null }),
                    ]
                );

                const escalationId = inserted[0]?.id;

                // 2. Real-time alert to the tenant room so dashboards pop the
                // escalation immediately. Fire-and-forget — never blocks.
                if (payload.io) {
                    try {
                        payload.io.to(`tenant_${tenant_id}`).emit('rohan:escalation_alert', {
                            escalation_id: escalationId,
                            type: escalationType,
                            lead_id,
                            persona_id: personaId,
                            suggested_role: suggestedRole,
                            context: triggerReason,
                            timestamp: Date.now(),
                        });
                    } catch (emitErr: any) {
                        logger.warn(`[RohanAutomationEngine] Socket.IO emit failed for escalation: ${emitErr.message}`);
                    }
                }

                // 3. Log an interaction so the lead timeline reflects the handoff.
                await pool.query(
                    `INSERT INTO interactions (tenant_id, lead_id, type, date, note, outcome)
                     VALUES ($1, $2, 'Call', NOW(), $3, 'Escalated to Human')`,
                    [tenant_id, lead_id, `Rohan AI escalated to human (${escalationType}). Reason: ${triggerReason}. Suggested role: ${suggestedRole}.`]
                );

                logger.info(`[RohanAutomationEngine] Escalation ${escalationId} recorded (${escalationType} -> ${suggestedRole}) for lead ${lead_id}`);
                return { success: true, message: `Escalation recorded (${escalationType}) and sales team alerted` };
            }

            return { success: false, message: `Action type '${action}' not supported by automation engine` };
        } catch (err: any) {
            logger.error(`[RohanAutomationEngine] Failed to process automation trigger: ${err.message}`);
            return { success: false, message: err.message };
        }
    }
}

export default new RohanAutomationEngine();
