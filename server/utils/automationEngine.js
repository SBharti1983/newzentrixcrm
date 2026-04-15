const pool = require('../db/pool');
const { sendWhatsappMessage } = require('./whatsapp');

/**
 * Zentrix Automation Engine
 * Processes event-driven workflows (e.g. Stage Change, Lead Creation)
 */
const processAutomations = async (tenantId, triggerType, leadData) => {
    try {
        console.log(`[Automation Engine] Processing ${triggerType} for Lead ${leadData.id} (Tenant: ${tenantId})`);

        // 1. Fetch active workflows for this trigger
        const { rows: workflows } = await pool.query(
            `SELECT * FROM workflows 
             WHERE tenant_id = $1 AND trigger_type = $2 AND is_active = TRUE`,
            [tenantId, triggerType]
        );

        if (workflows.length === 0) return;

        for (const workflow of workflows) {
            try {
                // 2. Validate trigger configuration (e.g. if trigger is STAGE_CHANGE, check target stage)
                let shouldExecute = true;
                const config = workflow.trigger_config || {};

                if (triggerType === 'STAGE_CHANGE' && config.target_stage) {
                    if (leadData.stage !== config.target_stage) {
                        shouldExecute = false;
                    }
                }

                if (!shouldExecute) continue;

                // 3. Execute Action
                if (workflow.action_type === 'SEND_WHATSAPP') {
                    const actionConfig = workflow.action_config || {};
                    let messageBody = actionConfig.message || '';

                    // Personalize message
                    messageBody = messageBody.replace(/\{\{name\}\}/gi, leadData.name.split(' ')[0]);
                    messageBody = messageBody.replace(/\{\{stage\}\}/gi, leadData.stage);
                    messageBody = messageBody.replace(/\{\{id\}\}/gi, leadData.id);

                    if (leadData.phone) {
                        console.log(`[Automation] Dispatching WhatsApp for Workflow: ${workflow.name}`);
                        const success = await sendWhatsappMessage(tenantId, leadData.phone, messageBody);

                        // Log activity
                        await pool.query(
                            `INSERT INTO automation_logs (tenant_id, workflow_id, lead_id, action_type, status, response)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [tenantId, workflow.id, leadData.id, 'SEND_WHATSAPP', success ? 'Success' : 'Failed', { message: messageBody }]
                        );

                        // Optional: Create interaction record
                        if (success) {
                            await pool.query(
                                `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
                                 VALUES ($1, $2, $3, 'Message', NOW(), $4, 'Delivered')`,
                                [tenantId, leadData.id, null, `Automated Message: ${workflow.name}\n${messageBody}`]
                            );
                        }
                    }
                }
            } catch (err) {
                console.error(`[Automation Engine] Workflow ${workflow.id} failed:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Automation Engine] Error:', err);
    }
};

module.exports = { processAutomations };
