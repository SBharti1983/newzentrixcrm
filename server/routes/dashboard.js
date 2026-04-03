const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/dashboard — all KPIs in one call
router.get('/', async (req, res) => {
    const tid = req.tenantId;
    const uid = req.user.id;
    const isManager = ['superadmin', 'admin', 'sales_manager'].includes(req.user.role);
    const filterPersonal = req.query.personal === 'true' || req.user.role === 'agent';

    try {
        // If a manager specifies a member_id, we show that specific agent's dashboard
        const targetUserId = (isManager && req.query.member_id && req.query.member_id !== 'undefined' && req.query.member_id !== 'null') ? req.query.member_id : uid;
        const effectivePersonal = filterPersonal || (req.query.member_id && req.query.member_id !== 'undefined' && req.query.member_id !== 'null');

        const leadParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const bookingParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const overdueParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const followupParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const nurtureParams = effectivePersonal ? [tid, targetUserId] : [tid];

        const queries = [
            // Lead summary
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE stage NOT IN ('Won','Lost')) as active_leads,
                    COUNT(*) FILTER (WHERE stage = 'Won') as won,
                    COUNT(*) FILTER (WHERE stage = 'Lost') as lost,
                    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as new_this_month,
                    COALESCE(ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1), 0) as win_rate
                FROM leads WHERE tenant_id = $1${effectivePersonal ? ' AND assigned_to = $2' : ''}`, leadParams),

            // Booking summary
            pool.query(`
                SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as total_value
                FROM bookings WHERE tenant_id = $1 AND status != 'Cancelled'${effectivePersonal ? ' AND assigned_agent_id = $2' : ''}`, bookingParams),

            // Overdue installments
            pool.query(`
                SELECT COUNT(i.id) as overdue_count, COALESCE(SUM(i.amount),0) as overdue_amount
                FROM installments i
                JOIN bookings b ON i.booking_id = b.id
                WHERE i.tenant_id = $1 AND i.status = 'Overdue'${effectivePersonal ? ' AND b.assigned_agent_id = $2' : ''}`, overdueParams),

            // Pipeline value
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
                FROM leads WHERE tenant_id = $1 AND stage NOT IN ('Won','Lost')${effectivePersonal ? ' AND assigned_to = $2' : ''}`, leadParams),

            // Leads by stage
            pool.query(`
                SELECT stage, COUNT(*) as count FROM leads
                WHERE tenant_id = $1${effectivePersonal ? ' AND assigned_to = $2' : ''}
                GROUP BY stage`, leadParams),

            // Upcoming follow-ups
            pool.query(`
                SELECT f.id, f.type, f.priority, f.scheduled_at, l.name as lead_name, u.name as agent_name, u.avatar
                FROM followups f
                LEFT JOIN leads l ON f.lead_id = l.id
                LEFT JOIN users u ON f.assigned_to = u.id
                WHERE f.tenant_id = $1 AND f.status = 'Pending'${effectivePersonal ? ' AND f.assigned_to = $2' : ''}
                ORDER BY f.scheduled_at LIMIT 10`, followupParams),

            // Nurture Summary
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE stage = 'Nurture' OR stage = 'Nurturing') as total_nurture,
                    (
                        SELECT COUNT(*)
                        FROM activity_log
                        WHERE tenant_id = $1
                          AND entity_type = 'lead'
                          AND action = 'updated'
                          AND (old_data->>'stage' ILIKE 'Nurture%')
                          AND (new_data->>'stage' NOT ILIKE 'Nurture%' OR new_data->>'stage' IS NULL)
                          AND created_at >= date_trunc('month', NOW())
                          ${effectivePersonal ? ' AND user_id = $2' : ''}
                    ) as reactivated_this_month
                FROM leads WHERE tenant_id = $1${effectivePersonal ? ' AND assigned_to = $2' : ''}`, nurtureParams)
        ];

        // Only fetch members list in global mode
        if (!effectivePersonal && isManager) {
            queries.push(pool.query(`
                SELECT u.id, u.name, u.avatar, u.role,
                       (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id AND stage NOT IN ('Won','Lost')) as active_leads,
                       (SELECT COUNT(*) FROM bookings WHERE assigned_agent_id = u.id AND status != 'Cancelled') as bookings,
                       (SELECT ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1) FROM leads WHERE assigned_to = u.id) as win_rate
                FROM users u
                WHERE u.tenant_id = $1 AND u.is_active = TRUE
                ORDER BY active_leads DESC`, [tid]));
        }

        const results = await Promise.all(queries);
        const [leads, bookings, installs, pipeline, stages, followups, nurture] = results;
        const members = (!effectivePersonal && isManager) ? results[7] : { rows: [] };

        res.json({
            meta: {
                view: effectivePersonal ? 'personal' : 'global',
                is_manager: isManager,
                user_id: targetUserId,
                is_impersonating: targetUserId !== uid
            },
            leads: leads.rows[0],
            bookings: bookings.rows[0],
            overdue: installs.rows[0],
            pipeline: { value: pipeline.rows[0].pipeline_value },
            stages: stages.rows,
            upcoming_followups: followups.rows,
            nurture: nurture.rows[0],
            members: members.rows
        });
    } catch (err) {
        require('fs').appendFileSync('dash_real_error.txt', err.toString() + '\\n' + (err.stack || '') + '\\n\\n');
        console.error('[DASHBOARD ERROR]', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

module.exports = router;
