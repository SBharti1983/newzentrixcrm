const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/commissions — List commission records
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let q = `
            SELECT 
                c.*, 
                l.name as lead_name,
                p.name as project_name,
                substring(c.booking_id::text, 1, 8) as booking_ref,
                CASE 
                    WHEN c.entity_type = 'Internal' THEN u.name 
                    ELSE cp.name 
                END as payee_name,
                CASE 
                    WHEN c.entity_type = 'Internal' THEN 'Agent' 
                    ELSE cp.company 
                END as payee_detail
            FROM commissions c
            LEFT JOIN leads l ON c.lead_id = l.id
            LEFT JOIN bookings b ON c.booking_id = b.id
            LEFT JOIN projects p ON l.project_id = p.id
            LEFT JOIN users u ON c.entity_id = u.id AND c.entity_type = 'Internal'
            LEFT JOIN channel_partners cp ON c.entity_id = cp.id AND c.entity_type = 'Channel Partner'
            WHERE c.tenant_id = $1
        `;
        const params = [req.tenantId];

        if (status) {
            q += ` AND c.status = $2`;
            params.push(status);
        }

        q += ` ORDER BY c.created_at DESC`;

        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
});

// PATCH /api/commissions/:id — Mark as Paid
router.patch('/:id', async (req, res) => {
    const { status } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE commissions 
             SET status = $1, paid_at = CASE WHEN $1 = 'Paid' THEN NOW() ELSE NULL END 
             WHERE id = $2 AND tenant_id = $3 
             RETURNING *`,
            [status || 'Paid', req.params.id, req.tenantId]
        );

        if (!rows[0]) return res.status(404).json({ error: 'Record not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update commission' });
    }
});

// POST /api/commissions/generate — (Internal Trigger) 
// Generate a commission when a booking happens or lead is won
router.post('/generate', async (req, res) => {
    const { booking_id } = req.body;
    try {
        // 1. Get booking and lead info
        const { rows: [booking] } = await pool.query(
            `SELECT b.*, l.id as lead_id, l.assigned_to, l.channel_partner_id, l.budget 
             FROM bookings b 
             JOIN customers c ON b.customer_id = c.id
             JOIN leads l ON c.lead_id = l.id 
             WHERE b.id = $1 AND b.tenant_id = $2`,
            [booking_id, req.tenantId]
        );

        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const dealValue = parseFloat(booking.total_amount || 0);
        const results = [];

        // 2. Internal Commission (Agent) - 1.5%
        if (booking.assigned_to) {
            const agentComm = (dealValue * 0.015);
            const { rows: [iComm] } = await pool.query(
                `INSERT INTO commissions (tenant_id, entity_type, entity_id, lead_id, booking_id, deal_value, commission_rate, payout_amount)
                 VALUES ($1, 'Internal', $2, $3, $4, $5, 1.5, $6) RETURNING *`,
                [req.tenantId, booking.assigned_to, booking.lead_id, booking_id, dealValue, agentComm]
            );
            results.push(iComm);
        }

        // 3. Channel Partner Commission - 2.0%
        if (booking.channel_partner_id) {
            const cpComm = (dealValue * 0.02);
            const { rows: [pComm] } = await pool.query(
                `INSERT INTO commissions (tenant_id, entity_type, entity_id, lead_id, booking_id, deal_value, commission_rate, payout_amount)
                 VALUES ($1, 'Channel Partner', $2, $3, $4, $5, 2.0, $6) RETURNING *`,
                [req.tenantId, booking.channel_partner_id, booking.lead_id, booking_id, dealValue, cpComm]
            );
            results.push(pComm);
        }

        res.status(201).json({ message: 'Commissions generated', count: results.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate commissions' });
    }
});

module.exports = router;
