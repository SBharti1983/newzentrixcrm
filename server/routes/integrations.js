const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const integrationService = require('../services/integrationService');

router.use(auth);

/**
 * POST /api/integrations/sync
 * Sync existing contacts from the provider
 */
router.post('/sync', async (req, res) => {
    const { provider } = req.body;
    try {
        const { rows } = await pool.query(
            'SELECT api_key FROM integrations WHERE tenant_id = $1 AND provider = $2',
            [req.tenantId, provider]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Integration not found' });

        const result = await integrationService.syncContacts(req.tenantId, rows[0].api_key);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});

/**
 * GET /api/integrations
 * Returns list of project integrations for the tenant.
 */
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, provider, is_active, webhook_url_key, config, created_at 
             FROM integrations WHERE tenant_id = $1`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * POST /api/integrations/setup
 * Initialize or update an integration
 */
router.post('/setup', async (req, res) => {
    const { provider, api_key, config } = req.body;

    try {
        const { rows } = await pool.query(
            `INSERT INTO integrations (tenant_id, provider, api_key, config)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tenant_id, provider) 
             DO UPDATE SET api_key = EXCLUDED.api_key, config = EXCLUDED.config, updated_at = NOW()
             RETURNING *`,
            [req.tenantId, provider, api_key || null, JSON.stringify(config || {})]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save integration' });
    }
});

/**
 * DELETE /api/integrations/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM integrations WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        res.json({ success: true });
    } catch (_err) {
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

/**
 * GET /api/integrations/incoming-logs
 */
router.get('/incoming-logs', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT l.*, ld.name as lead_name 
             FROM incoming_leads_log l
             LEFT JOIN leads ld ON l.lead_id = ld.id
             WHERE l.tenant_id = $1
             ORDER BY l.created_at DESC LIMIT 50`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;
