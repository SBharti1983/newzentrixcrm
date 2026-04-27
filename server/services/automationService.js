const pool = require('../db/pool');
const aiScreener = require('./aiScreener');
const { sendWhatsappMessage } = require('../utils/whatsapp');

/**
 * AutomationService handles the core logic for CRM workflows.
 * In a real production app, these would be managed by a queue (like BullMQ)
 * for reliability and retries.
 */
class AutomationService {
    /**
     * Triggered when a new lead is created
     */
    async handleLeadCreate(lead, io) {
        const { tenant_id, id: lead_id } = lead;

        try {
            // Find active workflows triggered by lead creation
            const { rows: workflows } = await pool.query(
                `SELECT * FROM workflows 
                 WHERE tenant_id = $1 AND trigger_type = 'lead_create' AND is_active = TRUE`,
                [tenant_id]
            );

            for (const wf of workflows) {
                let status = 'success';
                let details = { message: `Workflow '${wf.name}' executed.` };

                try {
                    if (wf.action_type === 'assign_agent') {
                        const agent = await this.executeAssignment(wf, lead, io);
                        details.agent_id = agent.id;
                        details.message = `Lead assigned to ${agent.name} via ${wf.name}`;
                    } else if (wf.action_type === 'notify_manager') {
                        await this.executeNotify(wf, lead, io);
                        details.message = `Managers notified for high-value lead.`;
                    } else if (wf.action_type === 'send_whatsapp') {
                        await this.executeWhatsappMessage(wf, lead, io);
                        details.message = `Automated WhatsApp sent to ${lead.name}`;
                    }

                    await this.logExecution(tenant_id, wf.id, lead_id, status, details);
                } catch (err) {
                    console.error(`[Automation Service] Lead workflow '${wf.name}' failed:`, err);
                    await this.logExecution(tenant_id, wf.id, lead_id, 'error', { error: err.message });
                }
            }

            // ── AI FIRST RESPONSE HANDSHAKE ──
            aiScreener.triggerHandshake(lead, io).catch(err => {
                console.error('[AI Handshake Loop] Failed:', err);
            });
        } catch (err) {
            console.error('[Automation Service] Lead creation trigger failed:', err);
        }
    }

    /**
     * Triggered when a lead's stage is updated
     */
    async handleStageChange(lead, oldStage, newStage, io) {
        const { tenant_id, id: lead_id } = lead;
        if (oldStage === newStage) return;

        try {
            // Find active workflows triggered by stage change
            const { rows: workflows } = await pool.query(
                `SELECT * FROM workflows 
                 WHERE tenant_id = $1 AND trigger_type = 'stage_change' AND is_active = TRUE`,
                [tenant_id]
            );

            for (const wf of workflows) {
                // Check if this workflow is specific to certain stages
                const conf = wf.trigger_config || {};
                if (conf.from_stage && conf.from_stage !== oldStage) continue;
                if (conf.to_stage && conf.to_stage !== newStage) continue;

                let status = 'success';
                let details = { message: `Stage change workflow '${wf.name}' matched.`, from: oldStage, to: newStage };

                try {
                    if (wf.action_type === 'create_followup') {
                        await this.executeCreateFollowup(wf, lead);
                        details.message = `Auto-scheduled follow-up for '${newStage}' progression.`;
                    } else if (wf.action_type === 'send_client_message') {
                        await this.executeClientMessage(wf, lead, io);
                        details.message = `Client message (${wf.action_config.channel}) sent for ${newStage}.`;
                    } else if (wf.action_type === 'notify_manager') {
                        await this.executeNotify(wf, lead, io);
                    } else if (wf.action_type === 'send_whatsapp') {
                        await this.executeWhatsappMessage(wf, lead, io);
                    }

                    await this.logExecution(tenant_id, wf.id, lead_id, status, details);
                } catch (err) {
                    console.error(`[Automation Service] Stage change workflow '${wf.name}' failed:`, err);
                    await this.logExecution(tenant_id, wf.id, lead_id, 'error', { error: err.message });
                }
            }

            // --- HARDCODED AI CORE AUTOMATIONS ---
            if (newStage === 'Site Visit Done') {
                this.handlePostSiteVisitFeedback(lead, io).catch(err => console.error('[AI Feedback Loop] Failed:', err));
            }

        } catch (err) {
            console.error('[Automation Service] Stage change trigger failed:', err);
        }
    }

    /**
     * AI-Powered Post-Site Visit Feedback Loop
     */
    async handlePostSiteVisitFeedback(lead, io) {
        const { tenant_id, id: lead_id, name, phone } = lead;
        if (!phone) return;

        // In a real app, we might wait 2 hours. For demo, we send immediately or log it.
        const message = `Hi ${name}, it was a pleasure showing you around today! 🏠 How did you find the experience? Did the project meet your expectations, or is there something specific we can improve? We value your honest feedback!`;

        try {
            // 1. Send via WhatsApp (using the notifications table)
            await pool.query(
                `INSERT INTO notifications (tenant_id, lead_id, channel, recipient, body, status)
                 VALUES ($1, $2, 'WhatsApp', $3, $4, 'Sent')`,
                [tenant_id, lead_id, phone, message]
            );

            // 2. Broadcast to UI so agent sees the auto-sent message
            if (io) {
                io.to(`tenant_${tenant_id}`).emit('notification', {
                    title: 'AI Follow-up Sent',
                    message: `Automated feedback request sent to ${name}.`,
                    type: 'whatsapp_sent'
                });
            }
        } catch (err) {
            console.error('[Automation] Feedback message failed:', err);
        }
    }

    /**
     * Auto-schedules a follow-up task
     */
    async executeCreateFollowup(wf, lead) {
        const { tenant_id, id: lead_id, assigned_to } = lead;
        const config = wf.action_config || {};
        const delayDays = parseInt(config.delay_days) || 1;
        
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + delayDays);
        scheduledAt.setHours(10, 0, 0, 0); // Default to 10 AM

        await pool.query(
            `INSERT INTO followups (tenant_id, lead_id, assigned_to, type, priority, scheduled_at, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenant_id, lead_id, assigned_to, config.task_type || 'Call', 'High', scheduledAt, `Auto-generated: ${wf.name}`]
        );
    }

    /**
     * Simulates sending an external message to the client
     */
    async executeClientMessage(wf, lead, io) {
        const { tenant_id, id: lead_id, name: lead_name, email, phone } = lead;
        const config = wf.action_config || {};
        const channel = config.channel || 'Email';
        
        await pool.query(
            `INSERT INTO notifications (tenant_id, lead_id, channel, recipient, subject, body, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenant_id, lead_id, channel, channel === 'Email' ? email : phone, 
             config.subject || 'Follow-up', config.body || `Hello ${lead_name}...`, 'Sent']
        );

        // Optionally notify the assigned agent that a message was sent
        if (lead.assigned_to && io) {
            io.to(`user_${lead.assigned_to}`).emit('notification', {
                title: '📧 Auto-Outgoing Message',
                message: `${channel} sent to ${lead_name} automatically.`,
                type: 'info'
            });
        }
    }

    /**
     * Sends a real-time personalized WhatsApp message
     */
    async executeWhatsappMessage(wf, lead, io) {
        const { tenant_id, id: lead_id, name, phone } = lead;
        const config = wf.action_config || {};
        const template = config.message || `Hi ${name.split(' ')[0]}, thanks for your interest! We will get back to you shortly.`;
        
        // Personalization
        let body = template.replace(/\{\{name\}\}/gi, name.split(' ')[0]);
        body = body.replace(/\{\{stage\}\}/gi, lead.stage);

        if (phone) {
            const success = await sendWhatsappMessage(tenant_id, phone, body);
            
            if (success) {
                // Log Interaction
                await pool.query(
                    `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
                     VALUES ($1, $2, $3, 'Message', NOW(), $4, 'Delivered')`,
                    [tenant_id, lead_id, null, `Automated WA: ${wf.name}\n${body}`]
                );

                if (io) {
                    io.to(`tenant_${tenant_id}`).emit('notification', {
                        title: 'WhatsApp Automation',
                        message: `Auto-message sent to ${name}`,
                        type: 'whatsapp_sent'
                    });
                }
            } else {
                throw new Error('WhatsApp dispatch failed - check API keys');
            }
        } else {
            throw new Error('No phone number provided for WhatsApp');
        }
    }

    /**
     * Executes lead assignment logic (Round Robin or Performance-based)
     */
    async executeAssignment(wf, lead, io) {
        const { tenant_id, id: lead_id, score: lead_score } = lead;

        // 1. Get available agents for this tenant with their 'Won' stats
        const { rows: agents } = await pool.query(
            `SELECT u.id, u.name, 
                COUNT(l.id) as total_assigned,
                COUNT(l.id) FILTER (WHERE l.stage = 'Won') as total_won
             FROM users u
             LEFT JOIN leads l ON l.assigned_to = u.id
             WHERE u.tenant_id = $1 AND u.role IN ('agent', 'sales_manager') 
             GROUP BY u.id, u.name
             ORDER BY u.id ASC`,
            [tenant_id]
        );

        if (agents.length === 0) throw new Error('No available agents for assignment');

        let targetAgent;

        // 2. Intelligent Routing: If lead score is high (>80), give to top performer
        if (lead_score >= 80) {
            // Calculate conversion rate and pick the best
            targetAgent = [...agents].sort((a, b) => {
                const rateA = a.total_assigned > 0 ? (a.total_won / a.total_assigned) : 0;
                const rateB = b.total_assigned > 0 ? (b.total_won / b.total_assigned) : 0;
                return rateB - rateA;
            })[0];
            console.log(`[Automation] Routing high-value lead ${lead_id} to top performer: ${targetAgent.name}`);
        } else {
            // Standard Round Robin using consistent hashing
            const hash = lead_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const agentIndex = hash % agents.length;
            targetAgent = agents[agentIndex] || agents[0];
        }

        // 3. Update lead
        await pool.query(
            `UPDATE leads SET assigned_to = $1 WHERE id = $2`,
            [targetAgent.id, lead_id]
        );

        // 4. Emit real-time notification
        if (io) {
            io.to(`user_${targetAgent.id}`).emit('notification', {
                title: '⚡ Auto-Distribution',
                message: `Lead '${lead.name}' was automatically assigned to you.`,
                bg: lead_score >= 80 ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'var(--navy-600)',
                type: 'lead_assigned',
                data: { leadId: lead_id }
            });
        }

        return targetAgent;
    }

    /**
     * Handles manager notifications for high-value leads
     */
    async executeNotify(wf, lead, io) {
        const { tenant_id, name: lead_name } = lead;

        // Find admins/managers for this tenant
        const { rows: managers } = await pool.query(
            `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('admin', 'sales_manager')`,
            [tenant_id]
        );

        for (const m of managers) {
            if (io) {
                io.to(`user_${m.id}`).emit('notification', {
                    title: '🔥 High-Value Lead Alert',
                    message: `New high-scoring lead created: ${lead_name}`,
                    type: 'alert',
                    data: { leadId: lead.id }
                });
            }
        }
    }

    /**
     * Stores the trace of the automation run
     */
    async logExecution(tenant_id, workflow_id, lead_id, status, details) {
        await pool.query(
            `INSERT INTO automation_logs (tenant_id, workflow_id, lead_id, status, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [tenant_id, workflow_id, lead_id, status, JSON.stringify(details)]
        );
    }

    /**
     * Starts a periodic check for time-based triggers (lead_idle, reminders)
     */
    startBackgroundWorker(io) {
        console.log('⚡ Automation Background Worker started.');
        // Lead Idle distribution — check every 10 minutes (was 2min, too aggressive for Supabase)
        setInterval(async () => {
            try {
                const { rows: workflows } = await pool.query(
                    `SELECT * FROM workflows WHERE trigger_type = 'lead_idle' AND is_active = TRUE`
                );
                for (const wf of workflows) {
                    await this.checkIdleLeads(wf, io);
                }
            } catch (err) {
                // Silently handle connection errors — don't spam console
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[Automation Background Worker] Error:', err.message);
                }
            }
        }, 600000); // 10 minutes

        // Process Drip Campaigns — check every 5 minutes (was 1min)
        setInterval(async () => {
            try {
                await this.processDrips(io);
            } catch (err) {
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[Drip Engine] Background Process Error:', err.message);
                }
            }
        }, 300000); // 5 minutes
    }

    async processDrips(_io) {
        const { rows: pending } = await pool.query(
            `SELECT de.*, c.name as campaign_name, l.name as lead_name, l.phone as lead_phone, l.email as lead_email
             FROM drip_enrollments de
             JOIN drip_campaigns c ON de.campaign_id = c.id
             JOIN leads l ON de.lead_id = l.id
             WHERE de.status = 'active' 
               AND de.next_run_at <= NOW() 
               AND c.is_active = TRUE`
        );

        for (const enrollment of pending) {
            const { tenant_id, campaign_id, lead_id, current_step_order } = enrollment;

            try {
                // 1. Get step content
                const { rows: stepData } = await pool.query(
                    `SELECT * FROM drip_steps WHERE campaign_id = $1 AND step_order = $2`,
                    [campaign_id, current_step_order]
                );

                if (stepData[0]) {
                    const step = stepData[0];
                    let currentSubject = step.subject;
                    let currentBody = step.body;
                    let assignedVariant = 'A';

                    // A/B Testing Logic
                    if (step.is_ab_test) {
                        // Check if already assigned for this step in this enrollment
                        const assignments = enrollment.variant_assignment || {};
                        const stepKey = `step_${current_step_order}`;

                        if (assignments[stepKey]) {
                            assignedVariant = assignments[stepKey];
                        } else {
                            // Assign 50/50
                            assignedVariant = Math.random() > 0.5 ? 'B' : 'A';
                            assignments[stepKey] = assignedVariant;

                            // Persist assignment
                            await pool.query(
                                `UPDATE drip_enrollments SET variant_assignment = $1 WHERE id = $2`,
                                [JSON.stringify(assignments), enrollment.id]
                            );
                        }

                        if (assignedVariant === 'B') {
                            currentSubject = step.subject_b || step.subject;
                            currentBody = step.body_b || step.body;
                        }
                    }

                    const recipient = step.channel === 'Email' ? enrollment.lead_email : enrollment.lead_phone;

                    // 2. Log Notification (in a real app, this would trigger Email/WhatsApp/SMS services)
                    await pool.query(
                        `INSERT INTO notifications (tenant_id, lead_id, channel, recipient, subject, body, status, sent_at, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
                        [
                            tenant_id,
                            lead_id,
                            step.channel,
                            recipient,
                            currentSubject,
                            currentBody,
                            'Delivered',
                            JSON.stringify({ drip_step: current_step_order, variant: assignedVariant })
                        ]
                    );

                    console.log(`[Drip Engine] Sent Variant ${assignedVariant} of step ${current_step_order} of '${enrollment.campaign_name}' to ${enrollment.lead_name}`);
                }

                // 3. Find next step
                const { rows: nextStepData } = await pool.query(
                    `SELECT * FROM drip_steps WHERE campaign_id = $1 AND step_order = $2`,
                    [campaign_id, current_step_order + 1]
                );

                if (nextStepData[0]) {
                    const nextStep = nextStepData[0];
                    const nextRun = new Date();
                    nextRun.setDate(nextRun.getDate() + (nextStep.delay_days || 0));
                    nextRun.setHours(nextRun.getHours() + (nextStep.delay_hours || 0));

                    await pool.query(
                        `UPDATE drip_enrollments SET 
                            current_step_order = $1, 
                            next_run_at = $2, 
                            updated_at = NOW() 
                         WHERE id = $3`,
                        [current_step_order + 1, nextRun, enrollment.id]
                    );
                } else {
                    // Campaign Finished
                    await pool.query(
                        `UPDATE drip_enrollments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                        [enrollment.id]
                    );
                }
            } catch (err) {
                console.error(`[Drip Engine] Failed to process enrollment ${enrollment.id}:`, err);
            }
        }
    }

    async checkIdleLeads(wf, io) {
        const { tenant_id, trigger_config } = wf;
        const hours = parseInt(trigger_config.hours) || 24;

        // Find leads that are 'New', older than threshold, and haven't triggered this workflow yet
        const { rows: idleLeads } = await pool.query(
            `SELECT l.* FROM leads l
             LEFT JOIN automation_logs al ON al.lead_id = l.id AND al.workflow_id = $1
             WHERE l.tenant_id = $2 
               AND l.stage = 'New'
               AND l.created_at < NOW() - make_interval(hours => $3)
               AND al.id IS NULL`,
            [wf.id, tenant_id, hours]
        );

        for (const lead of idleLeads) {
            try {
                if (wf.action_type === 'assign_agent') {
                    const agent = await this.executeAssignment(wf, lead, io);
                    await this.logExecution(tenant_id, wf.id, lead.id, 'success', {
                        message: `Stale lead '${lead.name}' automatically reassigned to ${agent.name} after ${hours}h idle.`
                    });
                }
            } catch (err) {
                console.error(`[Automation Worker] Failed to process idle lead ${lead.id}:`, err);
            }
        }
    }
}

module.exports = new AutomationService();
