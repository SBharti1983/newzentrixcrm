const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/bookings
router.get('/', async (req, res) => {
    try {
        const { status, agent, limit = 100, offset = 0 } = req.query;
        let q = `SELECT b.*, c.name as customer_name, c.phone as customer_phone,
                 p.name as project_name, u.name as agent_name, u.avatar as agent_avatar,
                 COALESCE(
                     (SELECT json_agg(i.* ORDER BY i.due_date) 
                      FROM installments i WHERE i.booking_id = b.id), 
                 '[]'::json) as installments
                 FROM bookings b
                 LEFT JOIN customers c ON b.customer_id = c.id
                 LEFT JOIN projects p ON b.project_id = p.id
                 LEFT JOIN users u ON b.assigned_agent_id = u.id
                 WHERE b.tenant_id = $1`;
        const params = [req.tenantId];
        if (status) { q += ` AND b.status=$${params.length + 1}`; params.push(status); }
        if (agent) { q += ` AND b.assigned_agent_id=$${params.length + 1}`; params.push(agent); }
        q += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /bookings error:', err);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// GET /api/bookings/:id with installments
router.get('/:id', async (req, res) => {
    try {
        const [bk, inst] = await Promise.all([
            pool.query(
                `SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                 p.name as project_name, u.name as agent_name
                 FROM bookings b
                 LEFT JOIN customers c ON b.customer_id = c.id
                 LEFT JOIN projects p ON b.project_id = p.id
                 LEFT JOIN users u ON b.assigned_agent_id = u.id
                 WHERE b.id=$1 AND b.tenant_id=$2`, [req.params.id, req.tenantId]),
            pool.query(
                `SELECT * FROM installments WHERE booking_id=$1 AND tenant_id=$2 ORDER BY due_date`,
                [req.params.id, req.tenantId]),
        ]);
        if (!bk.rows[0]) return res.status(404).json({ error: 'Booking not found' });
        res.json({ ...bk.rows[0], installments: inst.rows });
    } catch (err) {
        console.error('GET /bookings/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// POST /api/bookings
router.post('/', async (req, res) => {
    try {
        if (!['admin', 'sales_manager'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });
        const { customer_id, project_id, unit_no, unit_id, assigned_agent_id, total_amount, payment_plan, token_amount, token_mode, token_reference, notes } = req.body;
        if (!customer_id || !project_id) return res.status(400).json({ error: 'Customer and project are required' });

        const { rows } = await pool.query(
            `INSERT INTO bookings (tenant_id, customer_id, project_id, unit_no, unit_id, assigned_agent_id, total_amount, payment_plan, token_amount, token_collected, token_date, token_mode, token_reference, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,CURRENT_DATE,$10,$11,$12) RETURNING *`,
            [req.tenantId, customer_id, project_id, unit_no || null, unit_id || null, assigned_agent_id || null,
            total_amount || null, payment_plan || null, token_amount || null, token_mode || null, token_reference || null, notes || null]
        );
        // Mark unit as booked
        if (unit_id) {
            await pool.query(`UPDATE inventory SET status='Booked', booking_id=$1 WHERE id=$2 AND tenant_id=$3`,
                [rows[0].id, unit_id, req.tenantId]);
        }
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /bookings error:', err);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// PATCH /api/bookings/:id
router.patch('/:id', async (req, res) => {
    try {
        const allowed = ['status', 'unit_no', 'payment_plan', 'total_amount', 'token_amount', 'token_collected', 'token_date', 'token_mode', 'token_reference', 'notes'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3}`).join(',');
        const { rows } = await pool.query(
            `UPDATE bookings SET ${set} WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...Object.values(updates)]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /bookings error:', err);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// PATCH /api/bookings/:id/installments/:iid — mark paid
router.patch('/:id/installments/:iid', async (req, res) => {
    try {
        const { receipt_no, payment_mode, notes } = req.body;
        const { rows } = await pool.query(
            `UPDATE installments SET status='Paid', paid_date=CURRENT_DATE, receipt_no=$1, payment_mode=$2, notes=$3
             WHERE id=$4 AND booking_id=$5 AND tenant_id=$6 RETURNING *`,
            [receipt_no || null, payment_mode || null, notes || null, req.params.iid, req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Installment not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /installments error:', err);
        res.status(500).json({ error: 'Failed to update installment' });
    }
});

module.exports = router;
