import pool from '../db/pool';
import aiScreener from './aiScreener';
import aiService from './aiService';
import { sendWhatsappMessage } from '../utils/whatsapp';
import * as notifier from './notifier';

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
                let details: any = { message: `Workflow '${wf.name}' executed.` };

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
                let details: any = { message: `Stage change workflow '${wf.name}' matched.`, from: oldStage, to: newStage };

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
        const { tenant_id, id: lead_id, name, phone, project_name } = lead;
        if (!phone) return;

        try {
            // 1. Generate Personalized AI Message
            const message = await aiService.generateFeedbackRequest(name, project_name || 'the project');

            // 2. Send via WhatsApp (using the notifications table)
            await pool.query(
                `INSERT INTO notifications (tenant_id, lead_id, channel, recipient, body, status)
                 VALUES ($1, $2, 'WhatsApp', $3, $4, 'Sent')`,
                [tenant_id, lead_id, phone, message]
            );

            // 3. Broadcast to UI so agent sees the auto-sent message
            if (io) {
                io.to(`tenant_${tenant_id}`).emit('notification', {
                    title: 'AI Feedback Loop',
                    message: `Custom feedback request sent to ${name}.`,
                    type: 'whatsapp_sent'
                });
            }

            // 4. Log Interaction
            await pool.query(
                `INSERT INTO interactions (tenant_id, lead_id, type, date, note, outcome)
                 VALUES ($1, $2, 'AI Message', NOW(), $3, 'Sent')`,
                [tenant_id, lead_id, `AI Feedback Request: ${message}`]
            );
        } catch (err) {
            console.error('[AI Feedback Loop] Failed:', err);
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

        // 1. Get available active agents for this tenant with their stats and last assignment time
        const { rows: agents } = await pool.query(
            `SELECT u.id, u.name, 
                COUNT(l.id) as total_assigned,
                COUNT(l.id) FILTER (WHERE l.stage = 'Won') as total_won,
                MAX(l.created_at) as last_assigned_at
             FROM users u
             LEFT JOIN leads l ON l.assigned_to = u.id
             WHERE u.tenant_id = $1 AND u.role IN ('agent', 'sales_manager') AND u.is_active = TRUE
             GROUP BY u.id, u.name`,
            [tenant_id]
        );

        if (agents.length === 0) throw new Error('No available agents for assignment');

        // Clustered Offline Check: Filter to online agents across the cluster.
        const onlineAgents: any[] = [];
        if (io) {
            for (const agent of agents) {
                try {
                    const sockets = await io.in(`user_${agent.id}`).fetchSockets();
                    if (sockets.length > 0) {
                        onlineAgents.push(agent);
                    }
                } catch (err) {
                    console.error(`[Automation] Error fetching sockets for user_${agent.id}:`, err);
                }
            }
        }

        // Auto-escalation fallback: use online agents if any are available; otherwise, use all agents.
        const candidateAgents = onlineAgents.length > 0 ? onlineAgents : agents;

        let targetAgent;

        // 2. Intelligent Routing: If lead score is high (>=80), give to top performer
        if (lead_score >= 80) {
            // Sort by conversion rate descending. If equal, sort by last_assigned_at ASC.
            targetAgent = [...candidateAgents].sort((a, b) => {
                const rateA = a.total_assigned > 0 ? (a.total_won / a.total_assigned) : 0;
                const rateB = b.total_assigned > 0 ? (b.total_won / b.total_assigned) : 0;
                if (rateB !== rateA) return rateB - rateA;
                
                // Tie breaker: round robin
                const timeA = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
                const timeB = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
                if (timeA === 0 && timeB !== 0) return -1;
                if (timeB === 0 && timeA !== 0) return 1;
                return timeA - timeB;
            })[0];
            console.log(`[Automation] Routing high-value lead ${lead_id} to top performer: ${targetAgent?.name}`);
        } else {
            // Standard Round Robin: sort by last_assigned_at ASC, NULLS FIRST
            targetAgent = [...candidateAgents].sort((a, b) => {
                const timeA = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
                const timeB = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
                if (timeA === 0 && timeB !== 0) return -1;
                if (timeB === 0 && timeA !== 0) return 1;
                return timeA - timeB;
            })[0];
            console.log(`[Automation] Routing standard lead ${lead_id} via Round Robin to: ${targetAgent?.name}`);
        }

        if (!targetAgent) throw new Error('No target agent determined for assignment');

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
        // Lead Idle distribution — check every 10 minutes
        setInterval(async () => {
            try {
                const { rows: workflows } = await pool.query(
                    `SELECT * FROM workflows WHERE trigger_type = 'lead_idle' AND is_active = TRUE`
                );
                for (const wf of workflows) {
                    await this.checkIdleLeads(wf, io);
                }
            } catch (err) {
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[Automation Background Worker] Error:', err.message);
                }
            }
        }, 600000); // 10 minutes

        // Real-time Lead Auto-Reassignment Checker — check every 1 minute
        setInterval(async () => {
            try {
                await this.checkAutoReassignments(io);
            } catch (err) {
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[Auto-Reassignment Worker] Error:', err.message);
                }
            }
        }, 60000); // 1 minute

        // Process Drip Campaigns — check every 5 minutes
        setInterval(async () => {
            try {
                await this.processDrips(io);
            } catch (err) {
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[Drip Engine] Background Process Error:', err.message);
                }
            }
        }, 300000); // 5 minutes

        // Site Visit Reminders — check every 15 minutes
        setInterval(async () => {
            try {
                await this.checkSiteVisitReminders(io);
            } catch (err) {
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[SiteVisit Reminder] Background Process Error:', err.message);
                }
            }
        }, 900000); // 15 minutes

        // Followup Reminders — check every 2 minutes
        setInterval(async () => {
            try {
                await this.checkFollowupReminders(io);
            } catch (err) {
                if (!err.message?.includes('Connection terminated')) {
                    console.error('[Followup Reminder] Background Process Error:', err.message);
                }
            }
        }, 120000); // 2 minutes
    }

    async processDrips(_io: any) {
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
                        const assignments = enrollment.variant_assignment || {};
                        const stepKey = `step_${current_step_order}`;

                        if (assignments[stepKey]) {
                            assignedVariant = assignments[stepKey];
                        } else {
                            assignedVariant = Math.random() > 0.5 ? 'B' : 'A';
                            assignments[stepKey] = assignedVariant;
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
                        `UPDATE drip_enrollments SET current_step_order = $1, next_run_at = $2, updated_at = NOW() WHERE id = $3`,
                        [current_step_order + 1, nextRun, enrollment.id]
                    );
                } else {
                    await pool.query(`UPDATE drip_enrollments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [enrollment.id]);
                }
            } catch (err) {
                console.error(`[Drip Engine] Failed to process enrollment ${enrollment.id}:`, err);
            }
        }
    }

    async checkIdleLeads(wf, io) {
        const { tenant_id, trigger_config } = wf;
        const hours = parseInt(trigger_config.hours) || 24;

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

    async checkAutoReassignments(io) {
        try {
            // 1. Fetch all tenants
            const { rows: tenants } = await pool.query(
                `SELECT id, settings FROM tenants`
            );

            for (const t of tenants) {
                const settings = t.settings || {};
                const reassignMins = parseInt(settings.lead_auto_reassign_mins);

                if (!reassignMins || reassignMins <= 0) continue;

                // 2. Fetch leads in this tenant that:
                //    - are assigned to an agent (assigned_to is not NULL)
                //    - are in "New" or "New Lead" stage
                //    - has been assigned for more than reassignMins minutes
                //    - has NO Call interactions logged since assigned_at
                const { rows: leadsToReassign } = await pool.query(
                    `SELECT l.* FROM leads l
                     WHERE l.tenant_id = $1
                       AND l.assigned_to IS NOT NULL
                       AND l.status = 'Active'
                       AND l.stage IN ('New', 'New Lead')
                       AND l.assigned_at < NOW() - ($2 * interval '1 minute')
                       AND NOT EXISTS (
                           SELECT 1 FROM interactions i
                           WHERE i.lead_id = l.id
                             AND i.user_id = l.assigned_to
                             AND i.type = 'Call'
                             AND i.date >= l.assigned_at
                       )`,
                    [t.id, reassignMins]
                );

                for (const lead of leadsToReassign) {
                    try {
                        console.log(`[Auto-Reassign] Lead ${lead.id} (${lead.name}) is idle (no call within ${reassignMins} mins). Reassigning...`);
                        
                        // Exclude the current agent from reassignment!
                        const currentAgentId = lead.assigned_to;

                        // Get available active agents (excluding current agent)
                        const { rows: agents } = await pool.query(
                            `SELECT u.id, u.name, 
                                COUNT(l.id) as total_assigned,
                                COUNT(l.id) FILTER (WHERE l.stage = 'Won') as total_won,
                                MAX(l.created_at) as last_assigned_at
                             FROM users u
                             LEFT JOIN leads l ON l.assigned_to = u.id
                             WHERE u.tenant_id = $1 
                               AND u.role IN ('agent', 'sales_manager') 
                               AND u.is_active = TRUE
                               AND u.id != $2
                             GROUP BY u.id, u.name`,
                            [t.id, currentAgentId]
                        );

                        if (agents.length === 0) {
                            console.warn(`[Auto-Reassign] No alternative agents available for tenant ${t.id} to reassign lead ${lead.id}.`);
                            continue;
                        }

                        // Check which of these alternative agents are online (if io is available)
                        const onlineAgents: any[] = [];
                        if (io) {
                            for (const agent of agents) {
                                try {
                                    const sockets = await io.in(`user_${agent.id}`).fetchSockets();
                                    if (sockets.length > 0) {
                                        onlineAgents.push(agent);
                                    }
                                } catch (err) {
                                    console.error(`[Auto-Reassign] Socket check error for user_${agent.id}:`, err);
                                }
                            }
                        }

                        const candidateAgents = onlineAgents.length > 0 ? onlineAgents : agents;

                        // Round-robin selection: sort by last_assigned_at ASC, NULLS FIRST
                        const targetAgent = [...candidateAgents].sort((a, b) => {
                            const timeA = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
                            const timeB = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
                            if (timeA === 0 && timeB !== 0) return -1;
                            if (timeB === 0 && timeA !== 0) return 1;
                            return timeA - timeB;
                        })[0];

                        if (!targetAgent) continue;

                        // Reassign the lead: update leads table (the DB trigger will auto-update assigned_at!)
                        await pool.query(
                            `UPDATE leads SET assigned_to = $1 WHERE id = $2`,
                            [targetAgent.id, lead.id]
                        );

                        // Log the reassignment in interactions
                        await pool.query(
                            `INSERT INTO interactions (tenant_id, lead_id, type, note, outcome)
                             VALUES ($1, $2, 'System', $3, 'Reassigned')`,
                            [t.id, lead.id, `Lead automatically reassigned from agent due to inactivity (no call placed within ${reassignMins} mins).`]
                        );

                        // Notify new agent via socket
                        if (io) {
                            io.to(`user_${targetAgent.id}`).emit('notification', {
                                title: '⚡ Auto-Reassignment',
                                message: `Lead '${lead.name}' was automatically reassigned to you due to agent inactivity.`,
                                type: 'lead_assigned',
                                data: { leadId: lead.id }
                            });
                        }

                        // Log in automation logs
                        await this.logExecution(t.id, null, lead.id, 'success', {
                            message: `Stale lead '${lead.name}' automatically reassigned from ${currentAgentId} to ${targetAgent.name} after ${reassignMins}m idle.`
                        });

                    } catch (leadErr) {
                        console.error(`[Auto-Reassign] Failed to reassign lead ${lead.id}:`, leadErr);
                    }
                }
            }
        } catch (globalErr) {
            console.error('[Auto-Reassign Worker] Global execution failed:', globalErr);
        }
    }

    async checkSiteVisitReminders(io) {
        const { rows: upcoming } = await pool.query(`
            SELECT sv.*, l.name as lead_name, l.phone as lead_phone, l.email as lead_email, p.name as project_name, p.location as project_location
            FROM site_visits sv
            JOIN leads l ON sv.lead_id = l.id
            JOIN projects p ON sv.project_id = p.id
            WHERE sv.status = 'Scheduled'
              AND sv.scheduled_at > NOW()
              AND sv.scheduled_at < NOW() + interval '25 hours'
        `);

        for (const visit of upcoming) {
            const visitTime = new Date(visit.scheduled_at);
            const now = new Date();
            const hoursUntil = (visitTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (hoursUntil <= 24 && hoursUntil > 2) {
                const alreadySent = await this.checkReminderLog(visit.id, '24h_reminder');
                if (!alreadySent) await this.sendVisitReminder(visit, 'Tomorrow', '24h_reminder', io);
            }

            if (hoursUntil <= 1.5 && hoursUntil > 0) {
                const alreadySent = await this.checkReminderLog(visit.id, '1h_reminder');
                if (!alreadySent) await this.sendVisitReminder(visit, 'in 1 hour', '1h_reminder', io);
            }
        }
    }

    async checkReminderLog(visitId, type) {
        const { rows } = await pool.query(
            "SELECT id FROM automation_logs WHERE details->>'visit_id' = $1 AND details->>'reminder_type' = $2",
            [visitId, type]
        );
        return rows.length > 0;
    }

    async sendVisitReminder(visit, timing, type, io) {
        const message = `Reminder: Hi ${visit.lead_name}, your site visit for ${visit.project_name} is scheduled ${timing} at ${new Date(visit.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. \n📍 Location: ${visit.project_location}\nSee you there!`;

        if (visit.lead_phone) await sendWhatsappMessage(visit.tenant_id, visit.lead_phone, message);

        await this.logExecution(visit.tenant_id, null, visit.lead_id, 'success', {
            message: `Automated Site Visit Reminder (${type}) sent.`,
            visit_id: visit.id,
            reminder_type: type
        });

        if (io) {
            io.to(`tenant_${visit.tenant_id}`).emit('notification', {
                title: 'Site Visit Reminder',
                message: `Automated reminder sent to ${visit.lead_name}`,
                type: 'info'
            });
        }
    }

    async checkFollowupReminders(_io: any) {
        // Find Pending followups scheduled for "now"
        const { rows: due } = await pool.query(`
            SELECT f.*, l.name as lead_name
            FROM followups f
            JOIN leads l ON f.lead_id = l.id
            WHERE f.status = 'Pending'
              AND f.scheduled_at <= NOW()
              AND f.scheduled_at > NOW() - interval '30 minutes'
              AND f.assigned_to IS NOT NULL
        `);

        for (const f of due) {
            const { rows: logs } = await pool.query(
                "SELECT id FROM automation_logs WHERE details->>'followup_id' = $1 AND status = 'notified'",
                [f.id]
            );

            if (logs.length === 0) {
                await notifier.sendFollowupPush(
                    f.tenant_id, 
                    f.assigned_to, 
                    f.lead_name, 
                    new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                );

                await this.logExecution(f.tenant_id, null, f.lead_id, 'notified', {
                    message: 'Followup push notification sent.',
                    followup_id: f.id
                });
            }
        }
    }
}

export default new AutomationService();
