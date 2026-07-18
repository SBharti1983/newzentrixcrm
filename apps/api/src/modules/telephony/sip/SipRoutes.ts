/**
 * SIP Trunk configurations and credentials setup
 */

import express from 'express';
import { logger } from '@zentrix/logger';

const router = express.Router();

/**
 * GET /api/v1/telephony/sip/accounts
 * Retrieve SIP credentials configuration for softphones
 */
router.get('/accounts', (req, res) => {
    logger.info('[Telephony SIP] Fetching registered softphone credentials');
    res.json({
        success: true,
        credentials: {
            username: 'sip-agent-789',
            domain: 'sip.zentrixcrmindia.com',
            port: 5060,
            protocol: 'UDP'
        }
    });
});

export default router;
