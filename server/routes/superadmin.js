const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// Get all tenants (Super Admin only - in a real app, protect this route!)
router.get('/tenants', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT t.*, 
                   (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
                   (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) as lead_count
            FROM tenants t
            ORDER BY t.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// Update tenant status or plan
router.patch('/tenants/:id', async (req, res) => {
    const { is_active, plan } = req.body;
    try {
        if (is_active !== undefined) {
            await pool.query('UPDATE tenants SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
        }
        if (plan !== undefined) {
            await pool.query('UPDATE tenants SET plan = $1 WHERE id = $2', [plan, req.params.id]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

// Get system stats
router.get('/stats', async (req, res) => {
    try {
        const tenants = await pool.query('SELECT COUNT(*) FROM tenants');
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const leads = await pool.query('SELECT COUNT(*) FROM leads');
        const revenue = await pool.query("SELECT SUM(amount) FROM subscriptions WHERE status = 'active'");

        res.json({
            totalTenants: parseInt(tenants.rows[0].count),
            totalUsers: parseInt(users.rows[0].count),
            totalLeads: parseInt(leads.rows[0].count),
            mrr: parseFloat(revenue.rows[0].sum || 0)
        });
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
