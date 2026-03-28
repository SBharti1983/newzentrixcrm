const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/site-visits
router.get('/', async (req, res) => {
    try {
        const { status, agent, limit = 100, offset = 0 } = req.query;
        let q = `SELECT sv.*, l.name as lead_name, l.phone as lead_phone,
                 p.name as project_name, u.name as agent_name
                 FROM site_visits sv
                 LEFT JOIN leads l ON sv.lead_id = l.id
                 LEFT JOIN projects p ON sv.project_id = p.id
                 LEFT JOIN users u ON sv.assigned_agent = u.id
                 WHERE sv.tenant_id=$1`;
        const params = [req.tenantId];
        if (status) { q += ` AND sv.status=$${params.length + 1}`; params.push(status); }
        if (agent) { q += ` AND sv.assigned_agent=$${params.length + 1}`; params.push(agent); }
        q += ` ORDER BY sv.scheduled_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /site-visits error:', err);
        res.status(500).json({ error: 'Failed to fetch site visits' });
    }
});

// POST /api/site-visits
router.post('/', async (req, res) => {
    try {
        const { lead_id, project_id, scheduled_at, transport, pickup_location, assigned_agent, notes } = req.body;
        if (!lead_id || !scheduled_at) return res.status(400).json({ error: 'Lead and schedule date are required' });
        const { rows } = await pool.query(
            `INSERT INTO site_visits (tenant_id, lead_id, project_id, scheduled_at, transport, pickup_location, assigned_agent, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [req.tenantId, lead_id, project_id || null, scheduled_at, transport || 'Agent Car', pickup_location || null, assigned_agent || req.user.id, notes || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /site-visits error:', err);
        res.status(500).json({ error: 'Failed to create site visit' });
    }
});

// PATCH /api/site-visits/:id
router.patch('/:id', async (req, res) => {
    try {
        const allowed = ['status', 'scheduled_at', 'feedback', 'notes', 'transport', 'pickup_location', 'assigned_agent'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3}`).join(',');
        const { rows } = await pool.query(
            `UPDATE site_visits SET ${set} WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...Object.values(updates)]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Site visit not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /site-visits error:', err);
        res.status(500).json({ error: 'Failed to update site visit' });
    }
});

module.exports = router;
