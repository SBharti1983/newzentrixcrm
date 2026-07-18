/**
 * Outbound Dialer Controller and Routes
 */

import express from 'express';
import { logger } from '@zentrix/logger';
import pool from '../../../db/pool';
import redis from '../../../db/redis';

const router = express.Router();

/**
 * POST /api/v1/telephony/outbound/dial
 * Initiate outbound voice dialer connection
 */
router.post('/dial', (req, res) => {
    const { leadId, phone } = req.body;
    logger.info(`[Telephony Outbound] Initiating voice call to ${phone} (lead: ${leadId})`);
    res.json({
        success: true,
        callId: `call-dial-${Date.now()}`,
        status: 'dialing'
    });
});

/**
 * POST /api/v1/calls/initiate
 * Triggered by the CRM UI dialer button to register an outbound call interaction.
 */
router.post('/initiate', async (req: any, res) => {
    const { leadId, phoneNumber, method } = req.body;
    const tenantId = req.tenantId || 1;
    const userId = req.user?.id || null;

    logger.info(`[Telephony Outbound] Initiating ${method || 'GSM'} call to ${phoneNumber} (lead: ${leadId || 'N/A'})`);

    try {
        const { rows } = await pool.query(
            `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
             VALUES ($1, $2, $3, 'Call', NOW(), $4, 'Dialing') RETURNING id`,
            [
                tenantId,
                leadId || null,
                userId,
                `Outbound call initiated via ${method || 'GSM'}.`
            ]
        );

        // Invalidate dashboard and leads cache to ensure real-time reporting updates
        redis.del(`cache:/api/dashboard*|tenantId:${tenantId}*`).catch(() => {});
        redis.del(`cache:/api/leads*|tenantId:${tenantId}*`).catch(() => {});

        res.json({
            success: true,
            interactionId: rows[0]?.id || `call-dial-${Date.now()}`,
            status: 'dialing'
        });
    } catch (err: any) {
        logger.error(`[Telephony Outbound] Failed to log call initiation: ${err.message}`);
        res.status(500).json({ error: 'Failed to initiate call recording' });
    }
});

export default router;
