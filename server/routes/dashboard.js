const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/dashboard — all KPIs in one call
router.get('/', async (req, res) => {
    const tid = req.tenantId;
    try {
        const [leads, bookings, installs, pipeline, stages, followups] = await Promise.all([
            // Lead summary
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE stage NOT IN ('Won','Lost')) as active_leads,
                    COUNT(*) FILTER (WHERE stage = 'Won') as won,
                    COUNT(*) FILTER (WHERE stage = 'Lost') as lost,
                    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as new_this_month,
                    ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1) as win_rate
                FROM leads WHERE tenant_id = $1`, [tid]),

            // Booking summary
            pool.query(`
                SELECT COUNT(*) as total, SUM(total_amount) as total_value
                FROM bookings WHERE tenant_id = $1 AND status != 'Cancelled'`, [tid]),

            // Overdue installments
            pool.query(`
                SELECT COUNT(*) as overdue_count, COALESCE(SUM(amount),0) as overdue_amount
                FROM installments WHERE tenant_id = $1 AND status = 'Overdue'`, [tid]),

            // Pipeline value (active leads)
            pool.query(`
                SELECT COALESCE(SUM(
                    CASE
                        WHEN budget ILIKE '%Cr%' THEN 
                            COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 10000000
                        WHEN budget ILIKE '%L%' THEN 
                            COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 100000
                        ELSE 
                            COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0)
                    END
                ), 0) as pipeline_value
                FROM leads WHERE tenant_id = $1 AND stage NOT IN ('Won','Lost')`, [tid]),

            // Leads by stage
            pool.query(`
                SELECT stage, COUNT(*) as count FROM leads
                WHERE tenant_id = $1 GROUP BY stage ORDER BY
                CASE stage WHEN 'New' THEN 1 WHEN 'Contacted' THEN 2 WHEN 'Site Visit' THEN 3
                WHEN 'Negotiation' THEN 4 WHEN 'Won' THEN 5 WHEN 'Lost' THEN 6 ELSE 7 END`, [tid]),

            // Upcoming follow-ups
            pool.query(`
                SELECT f.*, l.name as lead_name, u.name as agent_name, u.avatar
                FROM followups f
                LEFT JOIN leads l ON f.lead_id = l.id
                LEFT JOIN users u ON f.assigned_to = u.id
                WHERE f.tenant_id = $1 AND f.status = 'Pending'
                ORDER BY f.scheduled_at LIMIT 10`, [tid]),
        ]);

        res.json({
            leads: leads.rows[0],
            bookings: bookings.rows[0],
            overdue: installs.rows[0],
            pipeline: { value: pipeline.rows[0].pipeline_value },
            stages: stages.rows,
            upcoming_followups: followups.rows,
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

module.exports = router;
