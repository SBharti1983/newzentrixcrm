const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

/**
 * GET /api/broker/stats
 * Get high-level stats for the logged-in broker
 */
router.get('/stats', async (req, res) => {
    // We assume the user has a channel_partner_id linked if they are a broker
    const { channel_partner_id } = req.user;
    if (!channel_partner_id) return res.status(403).json({ error: 'Access denied. Account not linked to a Partner profile.' });

    try {
        const stats = await pool.query(
            `SELECT 
                (SELECT COUNT(*) FROM leads WHERE channel_partner_id = $1) as total_leads,
                (SELECT COUNT(*) FROM leads WHERE channel_partner_id = $1 AND stage = 'Won') as conversions,
                (SELECT COALESCE(SUM(payout_amount), 0) FROM commissions WHERE entity_id = $1 AND status = 'Pending') as pending_payouts,
                (SELECT COALESCE(SUM(payout_amount), 0) FROM commissions WHERE entity_id = $1 AND status = 'Paid') as ytd_earnings
             `,
             [channel_partner_id]
        );
        res.json(stats.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch broker stats' });
    }
});

/**
 * GET /api/broker/leads
 * Get leads referred by this broker
 */
router.get('/leads', async (req, res) => {
    const { channel_partner_id } = req.user;
    if (!channel_partner_id) return res.status(403).json({ error: 'Access denied' });

    try {
        const { rows } = await pool.query(
            `SELECT l.*, p.name as project_name 
             FROM leads l 
             LEFT JOIN projects p ON l.project_id = p.id
             WHERE l.channel_partner_id = $1 
             ORDER BY l.created_at DESC`,
            [channel_partner_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

/**
 * POST /api/broker/leads
 * Broker submitting a new lead
 */
router.post('/leads', async (req, res) => {
    const { channel_partner_id, tenant_id } = req.user;
    const { name, phone, email, project_id, notes } = req.body;

    try {
        const { rows } = await pool.query(
            `INSERT INTO leads (tenant_id, channel_partner_id, name, phone, email, project_id, notes, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [tenant_id, channel_partner_id, name, phone, email, project_id, notes, 'Broker Referral']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to register lead' });
    }
});

/**
 * GET /api/broker/commissions
 * Broker tracking their payouts
 */
router.get('/commissions', async (req, res) => {
    const { channel_partner_id } = req.user;
    try {
        const { rows } = await pool.query(
            `SELECT c.*, l.name as lead_name, p.name as project_name
             FROM commissions c
             JOIN leads l ON c.lead_id = l.id
             JOIN bookings b ON c.booking_id = b.id
             JOIN projects p ON b.project_id = p.id
             WHERE c.entity_id = $1
             ORDER BY c.created_at DESC`,
            [channel_partner_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
});

module.exports = router;
