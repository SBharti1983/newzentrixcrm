import pool from '../../../db/pool';
import { sendWhatsappMessage } from '../../../utils/whatsapp';
import { logger } from '@zentrix/logger';

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

            return { success: false, message: `Action type '${action}' not supported by automation engine` };
        } catch (err: any) {
            logger.error(`[RohanAutomationEngine] Failed to process automation trigger: ${err.message}`);
            return { success: false, message: err.message };
        }
    }
}

export default new RohanAutomationEngine();
