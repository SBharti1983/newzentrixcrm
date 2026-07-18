/**
 * Voice Campaigns Controller and Routes
 */

import express from 'express';
import { logger } from '@zentrix/logger';

const router = express.Router();

/**
 * GET /api/v1/telephony/campaigns
 * List active voice calling campaigns
 */
router.get('/', (req, res) => {
    logger.info('[Telephony Campaigns] Fetching calling campaign lists');
    res.json({
        success: true,
        campaigns: [
            {
                id: 'camp-beta',
                name: 'Beta Project Outreach',
                leadsCount: 1500,
                status: 'running'
            }
        ]
    });
});

export default router;
