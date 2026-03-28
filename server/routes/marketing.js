const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/marketing/drips
router.get('/drips', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*, 
                (SELECT COUNT(*) FROM drip_steps WHERE campaign_id = c.id) as steps_count,
                (SELECT COUNT(*) FROM drip_enrollments WHERE campaign_id = c.id) as enrolled_count
             FROM drip_campaigns c 
             WHERE c.tenant_id = $1 
             ORDER BY c.created_at DESC`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch drips' });
    }
});

// POST /api/marketing/drips
router.post('/drips', async (req, res) => {
    const { name, description, steps } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: campaign } = await client.query(
            `INSERT INTO drip_campaigns (tenant_id, name, description) 
             VALUES ($1, $2, $3) RETURNING *`,
            [req.tenantId, name, description]
        );

        const campaignId = campaign[0].id;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            await client.query(
                `INSERT INTO drip_steps (campaign_id, step_order, delay_days, delay_hours, channel, body, subject, is_ab_test, body_b, subject_b)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    campaignId,
                    i + 1,
                    step.delay_days || 0,
                    step.delay_hours || 0,
                    step.channel,
                    step.body,
                    step.subject || '',
                    step.is_ab_test || false,
                    step.body_b || '',
                    step.subject_b || ''
                ]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(campaign[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create drip campaign' });
    } finally {
        client.release();
    }
});

// GET /api/marketing/drips/:id/analytics
router.get('/drips/:id/analytics', async (req, res) => {
    try {
        const { rows: steps } = await pool.query(
            `SELECT * FROM drip_steps WHERE campaign_id = $1 ORDER BY step_order`,
            [req.params.id]
        );

        const { rows: totals } = await pool.query(
            `SELECT 
                COUNT(*) filter (where event_type = 'sent') as total_sent,
                COUNT(*) filter (where event_type = 'opened') as total_opened,
                COUNT(*) filter (where event_type = 'clicked') as total_clicked
             FROM drip_events WHERE campaign_id = $1`,
            [req.params.id]
        );

        res.json({ steps, overall: totals[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// POST /api/marketing/drips/:id/enroll
router.post('/drips/:id/enroll', async (req, res) => {
    const { leadIds } = req.body;
    const { id: campaignId } = req.params;

    try {
        const { rows: firstStep } = await pool.query(
            'SELECT * FROM drip_steps WHERE campaign_id = $1 AND step_order = 1',
            [campaignId]
        );

        if (!firstStep[0]) return res.status(400).json({ error: 'Campaign has no steps' });

        for (const leadId of leadIds) {
            // Check if already enrolled
            const { rows: existing } = await pool.query(
                'SELECT id FROM drip_enrollments WHERE campaign_id = $1 AND lead_id = $2',
                [campaignId, leadId]
            );

            if (existing.length > 0) continue;

            // Calculate next_run_at based on first step delay
            const nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + (firstStep[0].delay_days || 0));
            nextRun.setHours(nextRun.getHours() + (firstStep[0].delay_hours || 0));

            await pool.query(
                `INSERT INTO drip_enrollments (tenant_id, campaign_id, lead_id, next_run_at)
                 VALUES ($1, $2, $3, $4)`,
                [req.tenantId, campaignId, leadId, nextRun]
            );
        }

        res.json({ success: true, message: `Enrolled ${leadIds.length} leads` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to enroll leads in drip' });
    }
});

module.exports = router;
