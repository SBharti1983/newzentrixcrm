const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const integrationService = require('../services/integrationService');

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

module.exports = router;
