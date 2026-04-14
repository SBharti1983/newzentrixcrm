const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { db: firebaseDB } = require('../utils/firebase');
const router = express.Router();
router.use(auth);

// GET /api/analytics — comprehensive analytics data
router.get('/', async (req, res) => {
    const tid = req.tenantId;
    const { range = '6months' } = req.query;

    let interval = '6 months';
    if (range === '3months') interval = '3 months';
    if (range === 'thisyear') interval = '1 year';

    try {
        const [
            leadsBySource, leadsByMonth, conversionFunnel,
            agentPerformance, revenueByProject, dailyActivity,
            interactionOutcomes, agentCalls, fleetStatusSnap
        ] = await Promise.all([
            // Leads by source
            pool.query(`SELECT source, COUNT(*) as count FROM leads WHERE tenant_id=$1 GROUP BY source ORDER BY count DESC`, [tid]),

            // Leads and Real Revenue by month
            pool.query(`
                WITH months AS (
                    SELECT date_trunc('month', series) as month
                    FROM generate_series(date_trunc('month', NOW() - CAST($2 AS interval)), date_trunc('month', NOW()), '1 month') series
                )
                SELECT 
                    TO_CHAR(m.month, 'Mon YY') as month,
                    COUNT(DISTINCT l.id) as leads,
                    COUNT(DISTINCT b.id) as conversions,
                    COALESCE(SUM(b.total_amount), 0) / 10000000 as revenue
                FROM months m
                LEFT JOIN leads l ON date_trunc('month', l.created_at) = m.month AND l.tenant_id = $1
                LEFT JOIN bookings b ON date_trunc('month', b.booking_date) = m.month AND b.tenant_id = $1 AND b.status != 'Cancelled'
                GROUP BY m.month
                ORDER BY m.month`, [tid, interval]),

            // Conversion funnel
            pool.query(`
                SELECT stage, COUNT(*) as count FROM leads WHERE tenant_id=$1
                GROUP BY stage ORDER BY
                CASE stage WHEN 'New' THEN 1 WHEN 'Contacted' THEN 2
                WHEN 'Site Visit' THEN 3 WHEN 'Negotiation' THEN 4
                WHEN 'Won' THEN 5 WHEN 'Lost' THEN 6 ELSE 7 END`, [tid]),

            // Agent performance - Real Data
            pool.query(`
                SELECT u.name, u.avatar, u.role,
                       COUNT(DISTINCT l.id) as total_leads,
                       COUNT(DISTINCT b.id) as won,
                       COALESCE(SUM(b.total_amount), 0) / 10000000 as revenue_cr,
                       COUNT(DISTINCT sv.id) as site_visits
                FROM users u
                LEFT JOIN leads l ON l.assigned_to = u.id AND l.tenant_id = u.tenant_id
                LEFT JOIN bookings b ON b.assigned_agent_id = u.id AND b.tenant_id = u.tenant_id AND b.status != 'Cancelled'
                LEFT JOIN site_visits sv ON sv.assigned_agent = u.id AND sv.tenant_id = u.tenant_id
                WHERE u.tenant_id=$1 AND u.role IN ('agent', 'sales_manager')
                GROUP BY u.id ORDER BY won DESC`, [tid]),

            // Revenue by project
            pool.query(`
                SELECT p.name, COUNT(b.id) as bookings, COALESCE(SUM(b.total_amount),0) / 10000000 as revenue
                FROM projects p
                LEFT JOIN bookings b ON b.project_id = p.id AND b.tenant_id = p.tenant_id AND b.status != 'Cancelled'
                WHERE p.tenant_id=$1 GROUP BY p.id ORDER BY revenue DESC`, [tid]),

            // Daily activity (last 30 days) for sparklines
            pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM leads 
                WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)`, [tid]),

            // Call Performance (Outcomes)
            pool.query(`
                SELECT outcome, COUNT(*) as count 
                FROM interactions 
                WHERE tenant_id=$1 AND type='Call' 
                GROUP BY outcome`, [tid]),

            // Calls by Agent
            pool.query(`
                SELECT u.name, COUNT(i.id) as calls, SUM(COALESCE(i.duration, 0)) as talk_time, MAX(i.date) as last_call
                FROM users u
                JOIN interactions i ON i.user_id = u.id
                WHERE u.tenant_id=$1 AND i.type='Call'
                GROUP BY u.id
                ORDER BY talk_time DESC`, [tid]),

            // Real-time Fleet Status from Firebase
            firebaseDB ? firebaseDB.ref(`telephony_mdm_config/${tid}/fleet_status`).once('value') : Promise.resolve(null)
        ]);

        const totalLeads = parseInt(leadsBySource.rows.reduce((s, row) => s + parseInt(row.count), 0));
        const wonLeads = parseInt(conversionFunnel.rows.find(r => r.stage === 'Won')?.count || 0);
        const totalRevenue = revenueByProject.rows.reduce((s, b) => s + parseFloat(b.revenue), 0);
        const totalCalls = interactionOutcomes.rows.reduce((s, r) => s + parseInt(r.count), 0);

        res.json({
            kpis: {
                totalRevenue: `₹${totalRevenue.toFixed(2)}Cr`, revenueChange: '+14.2%',
                totalLeads: totalLeads, leadsChange: '+8.4%',
                unitsSold: revenueByProject.rows.reduce((s, b) => s + parseInt(b.bookings), 0), unitsChange: '+12%',
                conversionRate: `${((wonLeads / totalLeads) * 100 || 0).toFixed(1)}%`, conversionChange: '+2.1%',
                totalCalls: totalCalls,
            },
            leadSources: leadsBySource.rows.map(r => ({ name: r.source, value: Math.round((parseInt(r.count) / (totalLeads || 1)) * 100) })),
            monthlySales: leadsByMonth.rows,
            pipelineDistribution: conversionFunnel.rows.map(r => ({ stage: r.stage, count: parseInt(r.count) })),
            agentPerformance: agentPerformance.rows.map(r => ({
                name: r.name,
                leads: parseInt(r.total_leads),
                conversions: parseInt(r.won),
                revenue: `₹${parseFloat(r.revenue_cr).toFixed(2)}Cr`,
                site_visits: parseInt(r.site_visits)
            })),
            callOutcomes: interactionOutcomes.rows.map(r => ({ name: r.outcome || 'Connected', value: parseInt(r.count) })),
            agentCalls: agentCalls.rows.map(r => ({ 
                name: r.name, 
                calls: parseInt(r.calls),
                talkTime: parseInt(r.talk_time) || 0,
                lastCall: r.last_call
            })),
            fleetStatus: {
                activeDevices: fleetStatusSnap ? Object.values(fleetStatusSnap.val() || {}).filter(v => v === 'Online').length : 0,
                totalMapped: fleetStatusSnap ? Object.keys(fleetStatusSnap.val() || {}).length : 0
            },
            revenueByProject: revenueByProject.rows,
            dailyActivity: dailyActivity.rows
        });
    } catch (err) {
        console.error('Analytics route error:', err);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

module.exports = router;
