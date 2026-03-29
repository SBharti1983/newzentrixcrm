const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/calls/stats — Voice Telemetry
router.get('/stats', async (req, res) => {
    const tid = req.tenantId;
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_calls,
                AVG(duration) as avg_duration,
                COUNT(*) FILTER (WHERE outcome = 'Connected') as success_calls,
                COUNT(*) FILTER (WHERE outcome = 'Busy' OR outcome = 'No Answer') as failed_calls
            FROM interactions 
            WHERE tenant_id = $1 AND type = 'Call'
        `, [tid]);

        const hourlyDist = await pool.query(`
            SELECT EXTRACT(HOUR FROM date) as hour, COUNT(*) as count
            FROM interactions
            WHERE tenant_id = $1 AND type = 'Call'
            GROUP BY hour
            ORDER BY hour
        `, [tid]);

        res.json({
            summary: stats.rows[0],
            hourly: hourlyDist.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load call telemetry' });
    }
});

// POST /api/calls/initiate — SIM-Bridge Initiation
router.post('/initiate', async (req, res) => {
    const { leadId, phoneNumber } = req.body;
    const tid = req.tenantId;
    const uid = req.userId;

    try {
        // Find lead
        const lead = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, tid]);
        if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

        // In a real GSM-integrated build, we would send a Socket event 
        // to a Mobile App or a GSM Gateway device connected to this tenant.
        if (req.io) {
            req.io.to(`user_${uid}`).emit('dialer_command', {
                command: 'START_GSM_CALL',
                phoneNumber: phoneNumber || lead.rows[0].phone,
                leadName: lead.rows[0].name,
                leadId: leadId
            });
        }

        // Create a pending interaction record
        const interaction = await pool.query(`
            INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, outcome, note)
            VALUES ($1, $2, $3, 'Call', NOW(), 'Calling...', 'Outgoing GSM Call via Integrated SIM')
            RETURNING *
        `, [tid, leadId, uid]);

        res.json({ success: true, interactionId: interaction.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initiate dialer' });
    }
});

// PATCH /api/calls/:id — End call / update telemetry
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { duration, outcome, note } = req.body;
    const tid = req.tenantId;

    try {
        const { rows } = await pool.query(`
            UPDATE interactions 
            SET duration = $1, outcome = $2, note = COALESCE($3, note), updated_at = NOW()
            WHERE id = $4 AND tenant_id = $5
            RETURNING *
        `, [duration, outcome, note, id, tid]);

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update call record' });
    }
});

module.exports = router;
