import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { AIDialer } from './AIDialer';
import { LeadQueue } from './LeadQueue';
import { RetryManager } from './RetryManager';
import { CampaignManager } from './CampaignManager';

export class PacingEngine {
    private readonly aiDialer = new AIDialer();
    private readonly leadQueue = new LeadQueue();
    private readonly retryManager = new RetryManager();
    private readonly campaignManager = new CampaignManager();
    
    // In-memory registry of active call sessions to throttle concurrent dials
    private readonly activeCallIds = new Set<string>();

    /**
     * Executes one cycle of the pacing checks.
     * Throttles dials dynamically to match telephony trunk capabilities (e.g. 10 lines max).
     */
    async tick(): Promise<void> {
        try {
            // 1. Retrieve the active AI Rohan user account ID from the database
            const { rows: users } = await pool.query(
                `SELECT id, name FROM users 
                 WHERE is_ai_employee = TRUE 
                   AND is_active = TRUE 
                 LIMIT 1`
            );

            const rohanUser = users[0];
            if (!rohanUser) {
                logger.info('[PacingEngine] Bypassed: No active AI Rohan user account exists.');
                return;
            }

            // 2. Check Rohan's current operational status and shift parameters
            const { rows: personas } = await pool.query(
                `SELECT id, current_status, cooldown_seconds, tenant_id, max_daily_outbound, max_concurrent_calls 
                 FROM ai_employee_personas 
                 WHERE role = 'rohan' AND is_active = TRUE 
                 LIMIT 1`
            );

            const persona = personas[0];
            if (!persona) {
                logger.warn('[PacingEngine] Bypassed: Rohan persona configuration not found.');
                return;
            }

            // If persona is offline (outside shift hours), skip dialing
            if (persona.current_status === 'offline') {
                logger.debug(`[PacingEngine] Rohan is currently offline. Pacing engine tick skipped.`);
                return;
            }

            // 3. Campaign manager daily limit check
            const maxDaily = persona.max_daily_outbound || 200;
            const limitReached = await this.campaignManager.checkDailyLimitReached(rohanUser.id, maxDaily);
            if (limitReached) {
                logger.warn('[PacingEngine] Autopilot dialing skipped: Daily campaign limits reached.');
                return;
            }

            // 4. Calculate available lines headroom
            const maxLines = persona.max_concurrent_calls || 10;
            const activeCount = this.activeCallIds.size;
            const availableLines = maxLines - activeCount;

            if (availableLines <= 0) {
                logger.info(`[PacingEngine] Telephony lines saturated (${activeCount}/${maxLines} active). Skipping dial tick.`);
                return;
            }

            logger.info(`[PacingEngine] Lines status: ${activeCount}/${maxLines} active. ${availableLines} available lines remaining.`);

            // 5. Retry manager constraints evaluation
            const excludedLeadIds = await this.retryManager.getExcludedLeads(rohanUser.id);

            // 6. Fetch batch of leads matching available lines headroom
            const leadsToDial = await this.leadQueue.fetchLeadBatch(
                rohanUser.id, 
                persona.tenant_id, 
                excludedLeadIds, 
                availableLines
            );

            if (leadsToDial.length === 0) {
                logger.debug('[PacingEngine] No pending leads in Rohan\'s dial queue.');
                return;
            }

            logger.info(`[PacingEngine] Dialer Pacing: Triggering ${leadsToDial.length} parallel dials (Limit: ${availableLines})...`);

            // Mark status to busy while dialing batch
            await pool.query(
                `UPDATE ai_employee_personas SET current_status = 'busy' WHERE id = $1`,
                [persona.id]
            );

            // 7. Execute dials concurrently to prevent overloading telephony trunks
            const dialPromises = leadsToDial.map(async (lead) => {
                const callId = `call-pacing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                this.activeCallIds.add(callId);
                
                try {
                    logger.info(`[PacingEngine] Line Open -> Dialing lead "${lead.name}" (+${lead.phone})`);
                    const connected = await this.aiDialer.executeOutboundCallCycle(lead, rohanUser.id);
                    if (connected) {
                        logger.info(`[PacingEngine] Line Connect -> Rohan starts talking to: "${lead.name}"`);
                    } else {
                        logger.info(`[PacingEngine] Line Disconnect -> Call did not answer/busy: "${lead.name}"`);
                    }
                } catch (err: any) {
                    logger.error(`[PacingEngine] Error on pacing dial for lead ${lead.name}: ${err.message}`);
                } finally {
                    this.activeCallIds.delete(callId);
                }
            });

            // Run all concurrent calls asynchronously
            Promise.all(dialPromises).then(async () => {
                // Restore status to idle after cooldown once the batch dials are completed
                const cooldownMs = (persona.cooldown_seconds || 45) * 1000;
                setTimeout(async () => {
                    try {
                        const { rows: current } = await pool.query(
                            `SELECT current_status FROM ai_employee_personas WHERE id = $1`,
                            [persona.id]
                        );
                        if (current[0]?.current_status !== 'offline') {
                            await pool.query(
                                `UPDATE ai_employee_personas SET current_status = 'idle' WHERE id = $1`,
                                [persona.id]
                            );
                            logger.info(`[PacingEngine] Pacing cooldown elapsed. Rohan is now 'idle' and ready for the next line batch.`);
                        }
                    } catch (err: any) {
                        logger.error(`[PacingEngine] Failed to reset status to idle: ${err.message}`);
                    }
                }, cooldownMs);
            });

        } catch (err: any) {
            logger.error(`[PacingEngine] Error in autopilot pacing engine: ${err.message}`);
        }
    }
}
