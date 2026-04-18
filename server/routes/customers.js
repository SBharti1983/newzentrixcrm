const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/customers
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const { rows } = await pool.query(
            `SELECT c.*, COUNT(b.id) as booking_count,
                 (
                     SELECT json_agg(json_build_object(
                         'id', i.id,
                         'type', i.type,
                         'date', to_char(i.date, 'DD Mon YYYY HH:MI AM'),
                         'duration', i.duration,
                         'note', i.note,
                         'agent', u.name
                     ) ORDER BY i.date DESC)
                     FROM interactions i
                     LEFT JOIN users u ON i.user_id = u.id
                     WHERE i.lead_id = c.lead_id
                 ) as interactions
             FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id
             WHERE c.tenant_id=$1 GROUP BY c.id
             ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
            [req.tenantId, parseInt(limit), parseInt(offset)]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /customers error:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*,
                json_agg(DISTINCT b.*) FILTER(WHERE b.id IS NOT NULL) as bookings,
                (
                    SELECT json_agg(json_build_object(
                        'id', i.id,
                        'type', i.type,
                        'date', to_char(i.date, 'DD Mon YYYY HH:MI AM'),
                        'duration', i.duration,
                        'note', i.note,
                        'agent', u.name
                    ) ORDER BY i.date DESC)
                        FROM interactions i
                        LEFT JOIN users u ON i.user_id = u.id
                        WHERE i.lead_id = c.lead_id
            ) as interactions
             FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id
             WHERE c.id = $1 AND c.tenant_id = $2 GROUP BY c.id`,
            [req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /customers/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// POST /api/customers
router.post('/', async (req, res) => {
    try {
        const { lead_id, name, email, phone, alt_phone, city, address, pan_number, aadhar_number, dob, segment, status, join_date, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Customer name is required' });

        // Check for existing customer with same lead_id
        if (lead_id) {
            const existing = await pool.query('SELECT * FROM customers WHERE lead_id = $1 AND tenant_id = $2', [lead_id, req.tenantId]);
            if (existing.rows[0]) {
                return res.json(existing.rows[0]);
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO customers(tenant_id, lead_id, name, email, phone, alt_phone, city, address, pan_number, aadhar_number, dob, segment, status, join_date, notes)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING * `,
            [req.tenantId, lead_id || null, name, email || null, phone || null, alt_phone || null, city || null, address || null, pan_number || null, aadhar_number || null, dob || null, segment || 'Standard', status || 'Active', join_date || new Date(), notes || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /customers error:', err);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// PATCH /api/customers/:id
router.patch('/:id', async (req, res) => {
    try {
        const allowed = ['name', 'email', 'phone', 'alt_phone', 'city', 'address', 'pan_number', 'aadhar_number', 'dob', 'segment', 'status', 'join_date', 'notes'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3} `).join(',');
        const { rows } = await pool.query(
            `UPDATE customers SET ${set} WHERE id = $1 AND tenant_id = $2 RETURNING * `,
            [req.params.id, req.tenantId, ...Object.values(updates)]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /customers error:', err);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

module.exports = router;
