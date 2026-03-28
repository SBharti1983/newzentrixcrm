const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/followups
router.get('/', async (req, res) => {
    try {
        const { status, type, date_from, date_to, limit = 200, offset = 0 } = req.query;
        let q = `SELECT f.*, l.name as lead_name, l.phone as lead_phone, l.stage as lead_stage,
                 u.name as agent_name, u.avatar
                 FROM followups f
                 LEFT JOIN leads l ON f.lead_id = l.id
                 LEFT JOIN users u ON f.assigned_to = u.id
                 WHERE f.tenant_id = $1`;
        const params = [req.tenantId];
        if (status) { q += ` AND f.status=$${params.length + 1}`; params.push(status); }
        if (type) { q += ` AND f.type=$${params.length + 1}`; params.push(type); }
        if (date_from) { q += ` AND f.scheduled_at >= $${params.length + 1}`; params.push(date_from); }
        if (date_to) { q += ` AND f.scheduled_at <= $${params.length + 1}`; params.push(date_to); }
        if (req.user.role === 'agent') {
            q += ` AND f.assigned_to = $${params.length + 1}`;
            params.push(req.user.id);
        }
        q += ` ORDER BY f.scheduled_at LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /followups error:', err);
        res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
});

// POST /api/followups
router.post('/', async (req, res) => {
    try {
        const { lead_id, assigned_to, type, priority, scheduled_at, note } = req.body;
        if (!lead_id || !scheduled_at) return res.status(400).json({ error: 'lead_id and scheduled_at required' });
        const { rows } = await pool.query(
            `INSERT INTO followups (tenant_id, lead_id, assigned_to, type, priority, scheduled_at, note)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.tenantId, lead_id, assigned_to || req.user.id, type || 'Call', priority || 'Medium', scheduled_at, note || null]
        );
        await pool.query(`UPDATE leads SET last_contact_at=NOW() WHERE id=$1`, [lead_id]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /followups error:', err);
        res.status(500).json({ error: 'Failed to create follow-up' });
    }
});

// PATCH /api/followups/:id
router.patch('/:id', async (req, res) => {
    try {
        const allowed = ['type', 'priority', 'scheduled_at', 'status', 'note', 'outcome', 'assigned_to'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3}`).join(',');
        const { rows } = await pool.query(
            `UPDATE followups SET ${set} WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...Object.values(updates)]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Follow-up not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /followups error:', err);
        res.status(500).json({ error: 'Failed to update follow-up' });
    }
});

// DELETE /api/followups/:id
router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await pool.query(
            `DELETE FROM followups WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
        );
        if (!rowCount) return res.status(404).json({ error: 'Follow-up not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('DELETE /followups error:', err);
        res.status(500).json({ error: 'Failed to delete follow-up' });
    }
});

module.exports = router;
