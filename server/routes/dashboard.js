const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { cacheResponse } = require('../middleware/cache');

const router = express.Router();
router.use(auth);

// GET /api/dashboard — all KPIs in one call
router.get('/', cacheResponse(300), async (req, res) => {
    const tid = req.tenantId;
    const uid = req.user.id;
    const isManager = ['admin', 'sales_manager', 'team_leader'].includes(req.user.role);
    const filterPersonal = req.query.personal === 'true' || req.user.role === 'agent';

    try {
        // 1. Get downline user IDs for hierarchy filtering (inside try/catch for safety)
        let downlineIds = [];
        if (req.user.role === 'team_leader') {
            const { rows: agents } = await pool.query('SELECT id FROM users WHERE reports_to = $1', [uid]);
            downlineIds = [uid, ...agents.map(a => a.id)];
        } else if (req.user.role === 'sales_manager') {
            const { rows: members } = await pool.query(`
                SELECT id FROM users WHERE reports_to = $1
                UNION
                SELECT id FROM users WHERE reports_to IN (SELECT id FROM users WHERE reports_to = $1)
            `, [uid]);
            downlineIds = [uid, ...members.map(m => m.id)];
        }
        // If a manager specifies a member_id, we show that specific agent's dashboard
        const targetUserId = (isManager && req.query.member_id && req.query.member_id !== 'undefined' && req.query.member_id !== 'null') ? req.query.member_id : uid;
        const effectivePersonal = filterPersonal || (req.query.member_id && req.query.member_id !== 'undefined' && req.query.member_id !== 'null');

        // Access check for impersonation
        if (targetUserId !== uid && req.user.role !== 'admin') {
            if (!downlineIds.includes(targetUserId)) {
                return res.status(403).json({ error: 'Access denied: User is not in your downline' });
            }
        }

        const leadParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const bookingParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const overdueParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const followupParams = effectivePersonal ? [tid, targetUserId] : [tid];
        const nurtureParams = effectivePersonal ? [tid, targetUserId] : [tid];

        const queries = [
            // KPI Consolidated Query (Leads, Bookings, Overdue, Pipeline)
            pool.query(`
                SELECT
                    (SELECT json_build_object(
                        'active_leads', COUNT(*) FILTER (WHERE stage NOT IN ('Won','Lost')),
                        'won', COUNT(*) FILTER (WHERE stage = 'Won'),
                        'lost', COUNT(*) FILTER (WHERE stage = 'Lost'),
                        'new_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())),
                        'win_rate', COALESCE(ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1), 0)
                    ) FROM leads WHERE tenant_id = $1${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')}) as leads_kpi,
                    
                    (SELECT json_build_object(
                        'total', COUNT(*),
                        'total_value', COALESCE(SUM(total_amount), 0)
                    ) FROM bookings WHERE tenant_id = $1 AND status != 'Cancelled'${effectivePersonal ? ' AND assigned_agent_id = $2' : (downlineIds.length ? ' AND assigned_agent_id = ANY($2)' : '')}) as bookings_kpi,
                    
                    (SELECT json_build_object(
                        'overdue_count', COUNT(i.id),
                        'overdue_amount', COALESCE(SUM(i.amount),0)
                    ) FROM installments i JOIN bookings b ON i.booking_id = b.id
                      WHERE i.tenant_id = $1 AND i.status = 'Overdue'${effectivePersonal ? ' AND b.assigned_agent_id = $2' : (downlineIds.length ? ' AND b.assigned_agent_id = ANY($2)' : '')}) as overdue_kpi,
                    
                    (SELECT COALESCE(SUM(
                        CASE
                            WHEN budget ILIKE '%Cr%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 10000000
                            WHEN budget ILIKE '%L%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 100000
                            ELSE COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0)
                        END
                    ), 0) FROM leads WHERE tenant_id = $1 AND stage NOT IN ('Won','Lost')${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')}) as pipeline_value,
                    
                    (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (first_i.created_at - l.created_at)) / 60)), 0)
                     FROM leads l
                     JOIN LATERAL (
                         SELECT created_at FROM interactions 
                         WHERE lead_id = l.id 
                         ORDER BY created_at ASC LIMIT 1
                     ) first_i ON true
                     WHERE l.tenant_id = $1
                     ${effectivePersonal ? ' AND l.assigned_to = $2' : (downlineIds.length ? ' AND l.assigned_to = ANY($2)' : '')}) as avg_response_time,

                    (SELECT COALESCE(ROUND(AVG(
                        CASE
                            WHEN budget ILIKE '%Cr%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 10000000
                            WHEN budget ILIKE '%L%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 100000
                            ELSE COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0)
                        END
                    )), 0) FROM leads WHERE tenant_id = $1 AND budget IS NOT NULL${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')}) as avg_deal_size
            `, effectivePersonal ? [tid, targetUserId] : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // Leads by stage
            pool.query(`
                SELECT stage, COUNT(*) as count FROM leads
                WHERE tenant_id = $1${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')}
                GROUP BY stage`, effectivePersonal ? leadParams : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // Upcoming follow-ups
            pool.query(`
                SELECT f.id, f.type, f.priority, f.scheduled_at, f.is_ai_generated, l.name as lead_name, u.name as agent_name, u.avatar
                FROM followups f
                LEFT JOIN leads l ON f.lead_id = l.id
                LEFT JOIN users u ON f.assigned_to = u.id
                WHERE f.tenant_id = $1 AND f.status = 'Pending'${effectivePersonal ? ' AND f.assigned_to = $2' : (downlineIds.length ? ' AND f.assigned_to = ANY($2)' : '')}
                ORDER BY f.scheduled_at LIMIT 10`, effectivePersonal ? followupParams : (downlineIds.length ? [tid, downlineIds] : [tid])),

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
                    ${effectivePersonal ? ' AND user_id = $2' : (downlineIds.length ? ' AND user_id = ANY($2)' : '')}
                    ) as reactivated_this_month
                FROM leads WHERE tenant_id = $1${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')}`, effectivePersonal ? nurtureParams : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // AI Sentiment Intelligence
            pool.query(`
                SELECT 
                    sentiment,
                    COUNT(*) as count
                FROM interactions 
                WHERE tenant_id = $1 AND sentiment IS NOT NULL
                ${effectivePersonal ? ' AND user_id = $2' : (downlineIds.length ? ' AND user_id = ANY($2)' : '')}
                GROUP BY sentiment`, effectivePersonal ? [tid, targetUserId] : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // High Friction Risk Alerts
            pool.query(`
                SELECT 
                    i.id, i.sentiment, i.note, i.date, 
                    l.name as lead_name, l.id as lead_id,
                    u.name as agent_name
                FROM interactions i
                JOIN leads l ON i.lead_id = l.id
                JOIN users u ON i.user_id = u.id
                WHERE i.tenant_id = $1 AND i.sentiment = 'Cold'
                ORDER BY i.date DESC LIMIT 5`, [tid]),

            pool.query(`
                WITH series AS (
                    SELECT generate_series(NOW() - INTERVAL '29 days', NOW(), '1 day')::date as d
                ),
                l_stats AS (
                    SELECT created_at::date as d, COUNT(*) as leads FROM leads WHERE tenant_id = $1 ${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')} GROUP BY 1
                ),
                c_stats AS (
                    SELECT date::date as d, COUNT(*) as calls FROM interactions WHERE tenant_id = $1 AND type = 'Call' ${effectivePersonal ? ' AND user_id = $2' : (downlineIds.length ? ' AND user_id = ANY($2)' : '')} GROUP BY 1
                ),
                f_stats AS (
                    SELECT scheduled_at::date as d, COUNT(*) as follow FROM followups WHERE tenant_id = $1 ${effectivePersonal ? ' AND assigned_to = $2' : (downlineIds.length ? ' AND assigned_to = ANY($2)' : '')} GROUP BY 1
                ),
                v_stats AS (
                    SELECT created_at::date as d, COUNT(*) as visits FROM activity_log WHERE tenant_id = $1 AND action = 'updated' AND new_data->>'stage' = 'Site Visit Done' ${effectivePersonal ? ' AND user_id = $2' : (downlineIds.length ? ' AND user_id = ANY($2)' : '')} GROUP BY 1
                )
                SELECT 
                    TO_CHAR(s.d, 'Mon DD') as name,
                    COALESCE(l_stats.leads, 0) as leads,
                    COALESCE(c_stats.calls, 0) as calls,
                    COALESCE(f_stats.follow, 0) as follow,
                    COALESCE(v_stats.visits, 0) as visits
                FROM series s
                LEFT JOIN l_stats ON s.d = l_stats.d
                LEFT JOIN c_stats ON s.d = c_stats.d
                LEFT JOIN f_stats ON s.d = f_stats.d
                LEFT JOIN v_stats ON s.d = v_stats.d
                ORDER BY s.d ASC`, effectivePersonal ? [tid, targetUserId] : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // Agent Telephony Quick Stats
            pool.query(`
                SELECT 
                    COUNT(*) filter (where created_at >= current_date) as calls_today,
                    SUM(duration) filter (where created_at >= current_date) as talk_time_today,
                    COUNT(*) filter (where note ILIKE '%Recording Link%') as synced_recordings
                FROM interactions
                WHERE tenant_id = $1 AND user_id = $2 AND type = 'Call'
            `, [tid, effectivePersonal ? targetUserId : uid]),

            // 🔥 Sentiment Heatmap: By Project
            pool.query(`
                SELECT 
                    p as project_name,
                    COUNT(*) filter (where sentiment = 'Positive') as positive,
                    COUNT(*) filter (where sentiment = 'Neutral') as neutral,
                    COUNT(*) filter (where sentiment = 'Concerned') as concerned,
                    COUNT(*) filter (where sentiment = 'Negative') as negative
                FROM interactions i, unnest(i.projects_discussed) p
                WHERE i.tenant_id = $1 AND i.sentiment IS NOT NULL
                GROUP BY p`, [tid]),

            // 🔥 Sentiment Heatmap: By Agent
            pool.query(`
                SELECT 
                    u.name as agent_name,
                    COUNT(*) filter (where i.sentiment = 'Positive') as positive,
                    COUNT(*) filter (where i.sentiment = 'Neutral') as neutral,
                    COUNT(*) filter (where i.sentiment = 'Concerned') as concerned,
                    COUNT(*) filter (where i.sentiment = 'Negative') as negative
                FROM interactions i
                JOIN users u ON i.user_id = u.id
                WHERE i.tenant_id = $1 AND i.sentiment IS NOT NULL
                GROUP BY u.id, u.name`, [tid]),

            // 🔥 Active Deals (Recent Bookings)
            pool.query(`
                SELECT b.unit_no, b.status, b.total_amount, p.name as project_name
                FROM bookings b
                JOIN projects p ON b.project_id = p.id
                WHERE b.tenant_id = $1 ${effectivePersonal ? ' AND b.assigned_agent_id = $2' : (downlineIds.length ? ' AND b.assigned_agent_id = ANY($2)' : '')}
                ORDER BY b.created_at DESC LIMIT 3`, effectivePersonal ? [tid, targetUserId] : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // 🔥 Assigned Team (Hierarchy / Squad)
            pool.query(`
                SELECT u.id, u.name, u.role, u.avatar, u.email, u.phone,
                       u.reports_to as manager_id
                FROM users u
                WHERE u.tenant_id = $1 AND u.is_active = TRUE
                AND (u.id = $2 OR u.reports_to = $2 OR u.id = (SELECT reports_to FROM users WHERE id = $2))
                LIMIT 5`, [tid, targetUserId]),

            // 🔥 Top Projects by Leads
            pool.query(`
                SELECT p.name, p.id, COUNT(l.id) as lead_count,
                       (SELECT image_url FROM projects WHERE id = p.id) as image_url
                FROM leads l
                JOIN projects p ON l.project_id = p.id
                WHERE l.tenant_id = $1 ${effectivePersonal ? ' AND l.assigned_to = $2' : (downlineIds.length ? ' AND l.assigned_to = ANY($2)' : '')}
                GROUP BY p.id, p.name
                ORDER BY lead_count DESC LIMIT 3`, effectivePersonal ? [tid, targetUserId] : (downlineIds.length ? [tid, downlineIds] : [tid])),

            // 🔥 Academy Stats (Level, XP, Certs, Performance) + Leaderboard
            pool.query(`
                SELECT json_build_object(
                    'total_xp', COALESCE(xp, 0),
                    'level', COALESCE(level, 1),
                    'rank_title', rank_title,
                    'certifications', (SELECT COUNT(*) FROM training_progress WHERE user_id = $1 AND is_certified = TRUE),
                    'avg_sim_score', (SELECT COALESCE(ROUND(AVG(best_score)), 0) FROM training_progress WHERE user_id = $1 AND best_score > 0),
                    'leaderboard', (
                        SELECT json_agg(lb) FROM (
                            SELECT id, name, avatar, xp, level, rank_title 
                            FROM users 
                            WHERE tenant_id = $2 AND is_active = TRUE
                            ORDER BY xp DESC LIMIT 5
                        ) lb
                    )
                ) as academy_stats
                FROM users WHERE id = $1
            `, [targetUserId, tid])
        ];

        // Only fetch members list in global mode
        if (!effectivePersonal && isManager) {
            queries.push(pool.query(`
                SELECT u.id, u.name, u.avatar, u.role,
                       (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id AND stage NOT IN ('Won','Lost')) as active_leads,
                       (SELECT COUNT(*) FROM bookings WHERE assigned_agent_id = u.id AND status != 'Cancelled') as bookings,
                       COALESCE((SELECT SUM(total_amount) FROM bookings WHERE assigned_agent_id = u.id AND status != 'Cancelled'), 0) as total_value,
                       (SELECT ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1) FROM leads WHERE assigned_to = u.id) as win_rate,
                       (SELECT ROUND(AVG(rapport_score), 1) FROM interactions WHERE user_id = u.id AND rapport_score IS NOT NULL) as rapport_avg,
                       (SELECT ROUND(AVG(closing_score), 1) FROM interactions WHERE user_id = u.id AND closing_score IS NOT NULL) as closing_avg
                FROM users u
                WHERE u.tenant_id = $1 AND u.is_active = TRUE
                ${downlineIds.length ? ' AND u.id = ANY($2)' : ''}
                ORDER BY active_leads DESC`, downlineIds.length ? [tid, downlineIds] : [tid]));
        }

        const executeQuery = async (p, label) => {
            try {
                return await p;
            } catch (e) {
                console.error(`[DASHBOARD SUB-QUERY ERROR] ${label}:`, e.message);
                return { rows: label === 'Members' ? [] : [{}] }; // Fallback to empty data
            }
        };

        // Execute all queries in parallel with dedicated error wrapping
        const results = await Promise.all([
            executeQuery(queries[0], 'KPIs'),
            executeQuery(queries[1], 'Stages'),
            executeQuery(queries[2], 'Followups'),
            executeQuery(queries[3], 'Nurture'),
            executeQuery(queries[4], 'Sentiment'),
            executeQuery(queries[5], 'Alerts'),
            executeQuery(queries[6], 'Trends'),
            executeQuery(queries[7], 'AgentStats'), 
            executeQuery(queries[8], 'ProjectSentimentHeatmap'),
            executeQuery(queries[9], 'AgentSentimentHeatmap'),
            executeQuery(queries[10], 'ActiveDeals'),
            executeQuery(queries[11], 'AssignedTeam'),
            executeQuery(queries[12], 'TopProjects'),
            executeQuery(queries[13], 'AcademyStats'),
            queries[14] ? executeQuery(queries[14], 'Members') : Promise.resolve({ rows: [] })
        ]);
        
        const [kpiResult, stages, followups, nurture, sentiment, alerts, trends, agentStats, projectHeatmap, agentHeatmap, activeDeals, assignedTeam, topProjects, academyResult, membersResult] = results;
        const kpis = kpiResult.rows[0] || {};

        res.json({
            meta: {
                view: effectivePersonal ? 'personal' : 'global',
                is_manager: isManager,
                user_id: targetUserId,
                is_impersonating: targetUserId !== uid
            },
            leads: kpis.leads_kpi || {},
            bookings: kpis.bookings_kpi || {},
            overdue: kpis.overdue_kpi || {},
            pipeline: { 
                value: kpis.pipeline_value || 0,
                avg_response_time: kpis.avg_response_time || 0,
                avg_deal_size: kpis.avg_deal_size || 0
            },
            stages: stages.rows,
            upcoming_followups: followups.rows,
            nurture: nurture.rows[0],
            sentiment: sentiment.rows,
            alerts: alerts.rows,
            trends: trends.rows,
            telephony_stats: agentStats.rows[0],
            heatmap: {
                projects: projectHeatmap.rows,
                agents: agentHeatmap.rows
            },
            active_deals: activeDeals.rows,
            assigned_team: assignedTeam.rows,
            top_projects: topProjects.rows,
            academy: (academyResult.rows[0]?.academy_stats) || { total_xp: 0, level: 1, certifications: 0, avg_sim_score: 0 },
            members: membersResult.rows
        });
    } catch (err) {
        require('fs').appendFileSync('dash_real_error.txt', err.toString() + '\n' + (err.stack || '') + '\n\n');
        console.error('[DASHBOARD ERROR]', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

module.exports = router;
