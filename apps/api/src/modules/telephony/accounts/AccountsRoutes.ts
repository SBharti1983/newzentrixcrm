/**
 * Accounts Inbound Call Routing Controller and Routes
 *
 * Integrates with Neha's memory layer via the HTTP bridge so that:
 *  - Completed inbound accounts calls are persisted to Neha's three-tier
 *    memory + pgvector (POST /log-call) for future semantic recall.
 *  - Past conversation turns for a customer/lead can be recalled
 *    (GET /recall) to give human agents context before they pick up.
 *  - Filing status (GST/ITR) can be looked up (GET /filing-status).
 *  - Outstanding dues can be looked up (GET /dues).
 *
 * All endpoints degrade gracefully: if the voice service is down they
 * return a structured "neha_unavailable" flag instead of erroring, so
 * the telephony flow never breaks.
 */

import express from 'express';
import { logger } from '@zentrix/logger';
import nehaBridge from '../../ai/nehaBridge/NehaBridgeClient';

const router = express.Router();

/**
 * GET /api/v1/telephony/accounts/config
 * Retrieve incoming accounts call routing configuration.
 */
router.get('/config', (req, res) => {
    logger.info('[Telephony Accounts] Retrieving accounts routing profile');
    res.json({
        enabled: true,
        role: 'neha',
        welcomeMsg: 'Welcome to Zentrix Accounts. Please wait while we connect you to Neha.',
        ivrMenu: {
            digits: {
                '1': 'gst_filing',
                '2': 'itr_filing',
                '3': 'invoice_query',
                '4': 'payment_query',
                '0': 'speak_to_manager',
            },
        },
    });
});

/**
 * POST /api/v1/telephony/accounts/log-call
 * Persist a completed inbound accounts call turn to Neha's memory + pgvector.
 *
 * Body:
 *   tenant_id, lead_id, persona_id, channel, turn_number,
 *   user_input, response_given, intent?, emotion?
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
        const result = await nehaBridge.logCall({
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
            logger.info(`[Telephony Accounts] Call logged to Neha memory (memory_id=${result.memory_id})`);
            return res.json({ ok: true, neha: true, data: result });
        }

        logger.warn('[Telephony Accounts] Neha bridge unavailable; call not indexed for recall');
        return res.json({ ok: true, neha: false, message: 'Call completed but not indexed (Neha unavailable)' });
    } catch (err: any) {
        logger.error(`[Telephony Accounts] log-call error: ${err.message}`);
        return res.status(500).json({ ok: false, error: 'Failed to log call' });
    }
});

/**
 * GET /api/v1/telephony/accounts/recall
 * Semantic recall of past conversation turns for a customer/lead, so a
 * human agent (Surendra) has context before picking up an inbound call.
 *
 * Query params: tenant_id, lead_id, query
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
        const result = await nehaBridge.recall({
            tenant_id: Number(tenant_id),
            lead_id: String(lead_id),
            query,
        });

        if (result) {
            return res.json({ ok: true, neha: true, data: result });
        }

        logger.warn('[Telephony Accounts] Neha recall unavailable; returning empty context');
        return res.json({
            ok: true,
            neha: false,
            data: {
                semantic_memories: [],
                recent_interactions: [],
                conversation_state: null,
            },
            message: 'No prior context available (Neha unavailable)',
        });
    } catch (err: any) {
        logger.error(`[Telephony Accounts] recall error: ${err.message}`);
        return res.status(500).json({ ok: false, error: 'Failed to recall context' });
    }
});

/**
 * GET /api/v1/telephony/accounts/filing-status
 * Look up recent GST/ITR filing tasks for a customer/lead.
 *
 * Query params: tenant_id, customer_id?, lead_id?
 */
router.get('/filing-status', async (req, res) => {
    const { tenant_id, customer_id, lead_id } = req.query as Record<string, string>;

    if (!tenant_id || (!customer_id && !lead_id)) {
        return res.status(400).json({
            ok: false,
            error: 'tenant_id and either customer_id or lead_id are required',
        });
    }

    try {
        const result = await nehaBridge.filingStatus({
            tenant_id: Number(tenant_id),
            customer_id: customer_id || undefined,
            lead_id: lead_id || undefined,
        });

        if (result) {
            return res.json({ ok: true, neha: true, data: result });
        }

        logger.warn('[Telephony Accounts] Neha filing-status unavailable');
        return res.json({
            ok: true,
            neha: false,
            data: { filings: [] },
            message: 'Filing status unavailable (Neha unavailable)',
        });
    } catch (err: any) {
        logger.error(`[Telephony Accounts] filing-status error: ${err.message}`);
        return res.status(500).json({ ok: false, error: 'Failed to fetch filing status' });
    }
});

/**
 * GET /api/v1/telephony/accounts/dues
 * Look up outstanding dues / payment schedule for a customer/lead.
 *
 * Query params: tenant_id, customer_id?, lead_id?
 */
router.get('/dues', async (req, res) => {
    const { tenant_id, customer_id, lead_id } = req.query as Record<string, string>;

    if (!tenant_id || (!customer_id && !lead_id)) {
        return res.status(400).json({
            ok: false,
            error: 'tenant_id and either customer_id or lead_id are required',
        });
    }

    try {
        const result = await nehaBridge.dues({
            tenant_id: Number(tenant_id),
            customer_id: customer_id || undefined,
            lead_id: lead_id || undefined,
        });

        if (result) {
            return res.json({ ok: true, neha: true, data: result });
        }

        logger.warn('[Telephony Accounts] Neha dues unavailable');
        return res.json({
            ok: true,
            neha: false,
            data: { dues: [] },
            message: 'Dues lookup unavailable (Neha unavailable)',
        });
    } catch (err: any) {
        logger.error(`[Telephony Accounts] dues error: ${err.message}`);
        return res.status(500).json({ ok: false, error: 'Failed to fetch dues' });
    }
});

export default router;
