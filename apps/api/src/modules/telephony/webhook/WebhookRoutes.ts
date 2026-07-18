/**
 * Twilio, Plivo and standard SIP calling status webhooks
 */

import express from 'express';
import { logger } from '@zentrix/logger';

const router = express.Router();

/**
 * POST /api/v1/telephony/webhook/status
 * Receive call status callback updates from Twilio/Plivo/Asterisk
 */
router.post('/status', (req, res) => {
    const { CallSid, CallStatus, Duration } = req.body;
    logger.info(`[Telephony Webhook] Received call status update: ${CallStatus} (sid: ${CallSid}, duration: ${Duration}s)`);
    res.json({
        success: true,
        message: 'Status received'
    });
});

export default router;
