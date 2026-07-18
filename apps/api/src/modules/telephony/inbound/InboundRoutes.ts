/**
 * Inbound Call Routing Controller and Routes
 *
 * Integrates with Rohan's memory layer via the HTTP bridge so that:
 *  - Completed inbound calls are persisted to Rohan's three-tier memory
 *    + pgvector (POST /log-call) for future semantic recall.
 *  - Past conversation turns for a lead can be recalled (GET /recall)
 *    to give human agents context before they pick up a call.
 *
 * Both endpoints degrade gracefully: if the voice service is down they
 * return a structured "rohan_unavailable" flag instead of erroring, so
 * the telephony flow never breaks.
 */

import express from 'express';
import { logger } from '@zentrix/logger';
import rohanBridge from '../../ai/rohanBridge/RohanBridgeClient';

const router = express.Router();

/**
 * GET /api/v1/telephony/inbound/config
 * Retrieve incoming call routing configuration (IVR, agent lines)
 */
router.get('/config', (req, res) => {
    logger.info('[Telephony Inbound] Retrieving incoming routing profiles');
    res.json({
        enabled: true,
        welcomeMsg: 'Welcome to Zentrix. Please wait while we connect your call.',
        ivrMenu: {
            digits: {
                '1': 'sales',
                '2': 'support'
            }
        }
    });
});

/**
 * POST /api/v1/telephony/inbound/log-call
 * Persist a completed inbound call turn to Rohan's memory + pgvector.
 *
 * Body:
 *   tenant_id, lead_id, persona_id, channel, turn_number,
 *   user_input, response_given, intent?, emotion?
 *
 * This is fire-and-forget from the telephony perspective: if Rohan is
 * unavailable we acknowledge but flag it so the caller knows the call
 * wasn't indexed for future recall.
 */
router.post('/log-call', async (req, res) => {
    const {
        tenant_id, lead_id, persona_id, channel,
        turn_number, user_input, response_given, intent, emotion,
    } = req.body || {};

    if (!tenant_id || !lead_id || !persona_id || !user_input || !response_given) {
        return res.status(400).json({
            ok: false,
            error: 'tenant_id, lead_id, persona_id, user_input, response_given are required',
        });
    }

    try {
        const result = await rohanBridge.logCall({
            tenant_id: Number(tenant_id),
            lead_id: String(lead_id),
            persona_id: String(persona_id),
            channel: channel || 'voice',
            turn_number: Number(turn_number) || 1,
            user_input,
            response_given,
            intent,
            emotion,
        });

        if (result) {
            logger.info(`[Telephony Inbound] Call logged to Rohan memory (memory_id=${result.memory_id})`);
            return res.json({ ok: true, rohan: true, data: result });
        }

        // Rohan unavailable — acknowledge but flag so caller knows.
        logger.warn('[Telephony Inbound] Rohan bridge unavailable; call not indexed for recall');
        return res.json({ ok: true, rohan: false, message: 'Call completed but not indexed (Rohan unavailable)' });
    } catch (err: any) {
        logger.error(`[Telephony Inbound] log-call error: ${err.message}`);
        return res.status(500).json({ ok: false, error: 'Failed to log call' });
    }
});

/**
 * GET /api/v1/telephony/inbound/recall
 * Semantic recall of past conversation turns for a lead, so a human
 * agent has context before picking up an inbound call.
 *
 * Query params: tenant_id, lead_id, query (what the caller is asking about)
 */
router.get('/recall', async (req, res) => {
    const { tenant_id, lead_id, query } = req.query as Record<string, string>;

    if (!tenant_id || !lead_id || !query) {
        return res.status(400).json({
            ok: false,
            error: 'tenant_id, lead_id, query are required query params',
        });
    }

    try {
        const result = await rohanBridge.recall({
            tenant_id: Number(tenant_id),
            lead_id: String(lead_id),
            query,
        });

        if (result) {
            return res.json({
                ok: true,
                rohan: true,
                data: result,
            });
        }

        // Rohan unavailable — return empty context so the agent UI can
        // show "no prior context available" instead of erroring.
        logger.warn('[Telephony Inbound] Rohan recall unavailable; returning empty context');
        return res.json({
            ok: true,
            rohan: false,
            data: {
                semantic_memories: [],
                recent_interactions: [],
                conversation_state: null,
            },
            message: 'No prior context available (Rohan unavailable)',
        });
    } catch (err: any) {
        logger.error(`[Telephony Inbound] recall error: ${err.message}`);
        return res.status(500).json({ ok: false, error: 'Failed to recall context' });
    }
});

export default router;
