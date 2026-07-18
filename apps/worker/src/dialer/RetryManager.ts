import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';

export class RetryManager {
    private readonly maxRetriesToday = 3;

    // Retry cooldown configurations (in milliseconds)
    private readonly cooldowns: Record<string, number> = {
        'busy': 30 * 60 * 1000,          // Retry after 30 minutes
        'no answer': 2 * 60 * 60 * 1000,  // Retry after 2 hours
        'no_answer': 2 * 60 * 60 * 1000,  // Retry after 2 hours
        'switched off': 4 * 60 * 60 * 1000, // Retry after 4 hours
        'switched_off': 4 * 60 * 60 * 1000, // Retry after 4 hours
        'failed': 1 * 60 * 60 * 1000,     // Retry after 1 hour
        'call failed': 1 * 60 * 60 * 1000  // Retry after 1 hour
    };

    /**
     * Identifies leads that should be temporarily or permanently excluded from dialing today.
     * Evaluates the outcome rules:
     * - No Answer -> Retry after 2 hours
     * - Busy -> Retry after 30 minutes
     * - Switched Off -> Retry after 4 hours
     * - Call Failed -> Retry after 1 hour
     * - Max Attempts -> Exclude permanently for the day if attempts >= 3
     */
    async getExcludedLeads(rohanUserId: string): Promise<string[]> {
        try {
            // Get all interaction outcomes today for calls initiated by Rohan
            const { rows } = await pool.query(
                `SELECT lead_id, outcome, date 
                 FROM interactions 
                 WHERE user_id = $1 
                   AND type = 'Call' 
                   AND date >= CURRENT_DATE`,
                [rohanUserId]
            );

            const attemptsMap = new Map<string, { count: number; lastAttemptTime: number; lastOutcome: string }>();

            for (const row of rows) {
                const leadId = row.lead_id;
                if (!leadId) continue;

                const dateMs = new Date(row.date).getTime();
                const outcome = (row.outcome || '').toLowerCase();
                
                // Track counts and latest attempt properties
                const current = attemptsMap.get(leadId) || { count: 0, lastAttemptTime: 0, lastOutcome: '' };
                
                const isRetryableFailure = 
                    outcome.includes('busy') || 
                    outcome.includes('no answer') || 
                    outcome.includes('no_answer') ||
                    outcome.includes('switched') ||
                    outcome.includes('failed');

                attemptsMap.set(leadId, {
                    count: current.count + 1,
                    lastAttemptTime: Math.max(current.lastAttemptTime, dateMs),
                    lastOutcome: isRetryableFailure ? outcome : current.lastOutcome
                });
            }

            const excludedLeads: string[] = [];
            const now = Date.now();

            for (const [leadId, stats] of attemptsMap.entries()) {
                // Exclude permanently for the day if max limit reached
                if (stats.count >= this.maxRetriesToday) {
                    logger.info(`[RetryManager] Lead ${leadId} hit daily max retry bounds (${stats.count}/${this.maxRetriesToday}). Excluded.`);
                    excludedLeads.push(leadId);
                    continue;
                }

                // Determine dynamic cooldown based on latest outcome
                const latestOutcome = stats.lastOutcome;
                let cooldownMs = 60 * 60 * 1000; // Default fallback to 1 hour

                for (const [key, value] of Object.entries(this.cooldowns)) {
                    if (latestOutcome.includes(key)) {
                        cooldownMs = value;
                        break;
                    }
                }

                const elapsedMs = now - stats.lastAttemptTime;
                if (elapsedMs < cooldownMs) {
                    const remainingMin = Math.ceil((cooldownMs - elapsedMs) / 60000);
                    logger.debug(`[RetryManager] Lead ${leadId} paused (Outcome: "${stats.lastOutcome}", Cooldown: ${cooldownMs / 60000}m, Remaining: ${remainingMin}m).`);
                    excludedLeads.push(leadId);
                }
            }

            return excludedLeads;
        } catch (err: any) {
            logger.error(`[RetryManager] Error evaluating retry list: ${err.message}`);
            return [];
        }
    }

    /**
     * Records a dial attempt if needed
     */
    async recordDialAttempt(leadId: string, tenantId: string, outcome: string): Promise<void> {
        logger.debug(`[RetryManager] Dial attempt registered: lead=${leadId}, outcome="${outcome}"`);
    }
}
