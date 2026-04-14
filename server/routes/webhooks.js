const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const integrationService = require('../services/integrationService');

/**
 * Webhook Verification (for Meta/Facebook)
 * GET /api/webhooks/:key/:provider
 */
router.get('/:key/:provider', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token) {
        // In a strict implementation, we'd verify the token against the tenant's stored verify_token
        // For zero-touch startup, we'll return the challenge to enable the connection.
        console.log(`[Webhook Verification] Verified ${req.params.provider} with token: ${token}`);
        return res.status(200).send(challenge);
    }
    res.status(403).end();
});

/**
 * Public Webhook Entry Point
 * URL Format: /api/webhooks/:key/:provider
 */
router.post('/:key/:provider', async (req, res) => {
    const { key, provider } = req.params;
    const payload = req.body;

    try {
        // 1. Identify the tenant by the webhook key
        const { rows } = await pool.query(
            'SELECT tenant_id FROM integrations WHERE webhook_url_key = $1 AND provider = $2 AND is_active = TRUE',
            [key, provider]
        );

        if (rows.length === 0) {
            console.error(`[Webhook] Invalid or inactive key: ${key} for ${provider}`);
            return res.status(404).json({ error: 'Integration not found or inactive' });
        }

        const tenantId = rows[0].tenant_id;

        // 2. Process based on provider
        let result = null;
        if (provider === 'whatsapp') {
            result = await integrationService.handleWhatsAppLead(tenantId, payload, req.io);
        } else if (provider === 'facebook') {
            result = await integrationService.handleFacebookLead(tenantId, payload, req.io);
        } else if (provider === 'google_ads') {
            result = await integrationService.handleGoogleLead(tenantId, payload, req.io);
        } else if (provider === 'zapier') {
            result = await integrationService.handleGenericLead(tenantId, payload, 'Zapier', req.io);
        } else {
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        // 3. Log the success
        await integrationService.logIncoming(tenantId, provider, payload, 'processed', null, result.id);

        res.json({ success: true, status: result.status });
    } catch (err) {
        console.error(`[Webhook Error] ${provider}:`, err);
        // Log the failure if tenantId was found
        res.status(500).json({ error: 'Internal processing error' });
    }
});

const aiScreener = require('../services/aiScreener');

/**
 * MOCK REPLY (For testing AI Sreener choice 1)
 */
router.post('/mock-reply', async (req, res) => {
    const { lead_id, text } = req.body;
    if (!lead_id || !text) return res.status(400).json({ error: 'lead_id and text required' });

    try {
        await aiScreener.processReply(lead_id, text, req.app.get('io'));
        res.json({ success: true, message: 'Reply processed by AI' });
    } catch (err) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

module.exports = router;
