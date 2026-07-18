import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';

export class CampaignManager {
    /**
     * Checks if Rohan has hit his maximum daily outbound call limit.
     */
    async checkDailyLimitReached(rohanUserId: string, maxDailyLimit: number): Promise<boolean> {
        try {
            // Count outbound calls placed by Rohan today
            const { rows } = await pool.query(
                `SELECT COUNT(*)::integer as count 
                 FROM interactions 
                 WHERE user_id = $1 
                   AND type = 'Call' 
                   AND date >= CURRENT_DATE`,
                [rohanUserId]
            );

            const count = rows[0]?.count || 0;
            const reached = count >= maxDailyLimit;
            
            if (reached) {
                logger.warn(`[CampaignManager] Rohan has reached his daily outbound limit of ${maxDailyLimit} calls (Attempted: ${count} today).`);
            } else {
                logger.info(`[CampaignManager] Rohan daily limits check: ${count}/${maxDailyLimit} calls placed today.`);
            }

            return reached;
        } catch (err: any) {
            logger.error(`[CampaignManager] Error checking daily limit bounds: ${err.message}`);
            return false; // Fallback to safely allow dialing
        }
    }
}
