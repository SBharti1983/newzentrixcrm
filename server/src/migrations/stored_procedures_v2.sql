-- ══════════════════════════════════════════════════════════════════
-- ZentrixCRM High-Performance Stored Procedures
-- Purpose: Consolidate multi-query Dashboard & Analytics endpoints
-- into single database round-trips for maximum performance.
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. get_dashboard_kpis(tenant_id, user_id, is_personal, downline_ids)
--    Replaces: 14 parallel Promise.all queries in dashboard.ts
--    Returns: Single JSON object with ALL dashboard data
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_kpis(
    p_tenant_id UUID,
    p_user_id UUID,
    p_is_personal BOOLEAN DEFAULT FALSE,
    p_downline_ids UUID[] DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_leads_kpi JSON;
    v_bookings_kpi JSON;
    v_overdue_kpi JSON;
    v_pipeline_value NUMERIC;
    v_avg_response_time NUMERIC;
    v_avg_deal_size NUMERIC;
    v_stages JSON;
    v_followups JSON;
    v_nurture JSON;
    v_sentiment JSON;
    v_alerts JSON;
    v_trends JSON;
    v_telephony JSON;
    v_project_heatmap JSON;
    v_agent_heatmap JSON;
    v_active_deals JSON;
    v_team JSON;
    v_top_projects JSON;
BEGIN
    -- ── Leads KPI ──
    SELECT json_build_object(
        'active_leads', COUNT(*) FILTER (WHERE stage NOT IN ('Won','Lost')),
        'won', COUNT(*) FILTER (WHERE stage = 'Won'),
        'lost', COUNT(*) FILTER (WHERE stage = 'Lost'),
        'new_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())),
        'win_rate', COALESCE(ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1), 0)
    ) INTO v_leads_kpi
    FROM leads
    WHERE tenant_id = p_tenant_id
      AND (NOT p_is_personal OR assigned_to = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids));

    -- ── Bookings KPI ──
    SELECT json_build_object(
        'total', COUNT(*),
        'total_value', COALESCE(SUM(total_amount), 0)
    ) INTO v_bookings_kpi
    FROM bookings
    WHERE tenant_id = p_tenant_id AND status != 'Cancelled'
      AND (NOT p_is_personal OR assigned_agent_id = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_agent_id = ANY(p_downline_ids));

    -- ── Overdue KPI ──
    SELECT json_build_object(
        'overdue_count', COUNT(i.id),
        'overdue_amount', COALESCE(SUM(i.amount), 0)
    ) INTO v_overdue_kpi
    FROM installments i
    JOIN bookings b ON i.booking_id = b.id
    WHERE i.tenant_id = p_tenant_id AND i.status = 'Overdue'
      AND (NOT p_is_personal OR b.assigned_agent_id = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR b.assigned_agent_id = ANY(p_downline_ids));

    -- ── Pipeline Value ──
    SELECT COALESCE(SUM(
        CASE
            WHEN budget ILIKE '%Cr%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 10000000
            WHEN budget ILIKE '%L%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 100000
            ELSE COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0)
        END
    ), 0) INTO v_pipeline_value
    FROM leads
    WHERE tenant_id = p_tenant_id AND stage NOT IN ('Won','Lost')
      AND (NOT p_is_personal OR assigned_to = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids));

    -- ── Avg Response Time (minutes) ──
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (first_i.created_at - l.created_at)) / 60)), 0)
    INTO v_avg_response_time
    FROM leads l
    JOIN LATERAL (
        SELECT created_at FROM interactions WHERE lead_id = l.id ORDER BY created_at ASC LIMIT 1
    ) first_i ON true
    WHERE l.tenant_id = p_tenant_id
      AND (NOT p_is_personal OR l.assigned_to = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR l.assigned_to = ANY(p_downline_ids));

    -- ── Avg Deal Size ──
    SELECT COALESCE(ROUND(AVG(
        CASE
            WHEN budget ILIKE '%Cr%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 10000000
            WHEN budget ILIKE '%L%' THEN COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0) * 100000
            ELSE COALESCE(CAST(NULLIF(regexp_replace(budget, '[^0-9.]', '', 'g'), '') AS DECIMAL), 0)
        END
    )), 0) INTO v_avg_deal_size
    FROM leads
    WHERE tenant_id = p_tenant_id AND budget IS NOT NULL
      AND (NOT p_is_personal OR assigned_to = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids));

    -- ── Stages ──
    SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) INTO v_stages
    FROM (
        SELECT stage, COUNT(*) as count FROM leads
        WHERE tenant_id = p_tenant_id
          AND (NOT p_is_personal OR assigned_to = p_user_id)
          AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids))
        GROUP BY stage
    ) s;

    -- ── Upcoming Followups ──
    SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json) INTO v_followups
    FROM (
        SELECT f.id, f.type, f.priority, f.scheduled_at, f.is_ai_generated, l.name as lead_name, u.name as agent_name, u.avatar
        FROM followups f
        LEFT JOIN leads l ON f.lead_id = l.id
        LEFT JOIN users u ON f.assigned_to = u.id
        WHERE f.tenant_id = p_tenant_id AND f.status = 'Pending'
          AND (NOT p_is_personal OR f.assigned_to = p_user_id)
          AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR f.assigned_to = ANY(p_downline_ids))
        ORDER BY f.scheduled_at LIMIT 10
    ) f;

    -- ── Nurture Summary ──
    SELECT json_build_object(
        'total_nurture', COUNT(*) FILTER (WHERE stage = 'Nurture' OR stage = 'Nurturing'),
        'reactivated_this_month', (
            SELECT COUNT(*) FROM activity_log
            WHERE tenant_id = p_tenant_id AND entity_type = 'lead' AND action = 'updated'
              AND (old_data->>'stage' ILIKE 'Nurture%')
              AND (new_data->>'stage' NOT ILIKE 'Nurture%' OR new_data->>'stage' IS NULL)
              AND created_at >= date_trunc('month', NOW())
              AND (NOT p_is_personal OR user_id = p_user_id)
              AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR user_id = ANY(p_downline_ids))
        )
    ) INTO v_nurture
    FROM leads
    WHERE tenant_id = p_tenant_id
      AND (NOT p_is_personal OR assigned_to = p_user_id)
      AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids));

    -- ── Sentiment Distribution ──
    SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) INTO v_sentiment
    FROM (
        SELECT sentiment, COUNT(*) as count FROM interactions
        WHERE tenant_id = p_tenant_id AND sentiment IS NOT NULL
          AND (NOT p_is_personal OR user_id = p_user_id)
          AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR user_id = ANY(p_downline_ids))
        GROUP BY sentiment
    ) s;

    -- ── High Friction Alerts ──
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_alerts
    FROM (
        SELECT i.id, i.sentiment, i.note, i.date, l.name as lead_name, l.id as lead_id, u.name as agent_name
        FROM interactions i
        JOIN leads l ON i.lead_id = l.id
        JOIN users u ON i.user_id = u.id
        WHERE i.tenant_id = p_tenant_id AND i.sentiment = 'Cold'
        ORDER BY i.date DESC LIMIT 5
    ) a;

    -- ── 30-Day Trends ──
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.d), '[]'::json) INTO v_trends
    FROM (
        WITH series AS (SELECT generate_series(NOW() - INTERVAL '29 days', NOW(), '1 day')::date as d)
        SELECT
            TO_CHAR(s.d, 'Mon DD') as name,
            s.d,
            COALESCE((SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND created_at::date = s.d
              AND (NOT p_is_personal OR assigned_to = p_user_id)
              AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids))
            ), 0) as leads,
            COALESCE((SELECT COUNT(*) FROM interactions WHERE tenant_id = p_tenant_id AND type = 'Call' AND date::date = s.d
              AND (NOT p_is_personal OR user_id = p_user_id)
              AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR user_id = ANY(p_downline_ids))
            ), 0) as calls,
            COALESCE((SELECT COUNT(*) FROM followups WHERE tenant_id = p_tenant_id AND scheduled_at::date = s.d
              AND (NOT p_is_personal OR assigned_to = p_user_id)
              AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR assigned_to = ANY(p_downline_ids))
            ), 0) as follow
        FROM series s
    ) t;

    -- ── Telephony Quick Stats ──
    SELECT json_build_object(
        'calls_today', COUNT(*) FILTER (WHERE created_at >= current_date),
        'talk_time_today', COALESCE(SUM(duration) FILTER (WHERE created_at >= current_date), 0),
        'synced_recordings', COUNT(*) FILTER (WHERE note ILIKE '%Recording Link%')
    ) INTO v_telephony
    FROM interactions
    WHERE tenant_id = p_tenant_id AND user_id = p_user_id AND type = 'Call';

    -- ── Active Deals ──
    SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) INTO v_active_deals
    FROM (
        SELECT b.unit_no, b.status, b.total_amount, p.name as project_name
        FROM bookings b JOIN projects p ON b.project_id = p.id
        WHERE b.tenant_id = p_tenant_id AND b.status != 'Cancelled'
          AND (NOT p_is_personal OR b.assigned_agent_id = p_user_id)
          AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR b.assigned_agent_id = ANY(p_downline_ids))
        ORDER BY b.created_at DESC LIMIT 3
    ) d;

    -- ── Top Projects ──
    SELECT COALESCE(json_agg(row_to_json(tp)), '[]'::json) INTO v_top_projects
    FROM (
        SELECT p.name, p.id, COUNT(l.id) as lead_count
        FROM leads l JOIN projects p ON l.project_id = p.id
        WHERE l.tenant_id = p_tenant_id
          AND (NOT p_is_personal OR l.assigned_to = p_user_id)
          AND (p_is_personal OR array_length(p_downline_ids, 1) IS NULL OR l.assigned_to = ANY(p_downline_ids))
        GROUP BY p.id, p.name ORDER BY lead_count DESC LIMIT 3
    ) tp;

    -- ── Assemble Final JSON ──
    result := json_build_object(
        'leads', v_leads_kpi,
        'bookings', v_bookings_kpi,
        'overdue', v_overdue_kpi,
        'pipeline', json_build_object(
            'value', v_pipeline_value,
            'avg_response_time', v_avg_response_time,
            'avg_deal_size', v_avg_deal_size
        ),
        'stages', v_stages,
        'upcoming_followups', v_followups,
        'nurture', v_nurture,
        'sentiment', v_sentiment,
        'alerts', v_alerts,
        'trends', v_trends,
        'telephony_stats', v_telephony,
        'active_deals', v_active_deals,
        'top_projects', v_top_projects
    );

    RETURN result;
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 2. get_analytics_summary(tenant_id, interval_str)
--    Replaces: 9 parallel Promise.all queries in analytics.ts
--    Returns: Single JSON object with ALL analytics data
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_tenant_id UUID,
    p_interval TEXT DEFAULT '6 months'
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_lead_sources JSON;
    v_monthly JSON;
    v_funnel JSON;
    v_agents JSON;
    v_revenue_project JSON;
    v_daily JSON;
    v_call_outcomes JSON;
    v_agent_calls JSON;
    v_total_leads INT;
    v_won_leads INT;
    v_total_revenue NUMERIC;
    v_total_calls INT;
    v_total_bookings INT;
BEGIN
    -- ── Leads by Source ──
    SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) INTO v_lead_sources
    FROM (
        SELECT source, COUNT(*) as count FROM leads
        WHERE tenant_id = p_tenant_id GROUP BY source ORDER BY count DESC
    ) s;

    -- ── Monthly Trends (leads + revenue) ──
    SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.month_ts), '[]'::json) INTO v_monthly
    FROM (
        WITH months AS (
            SELECT date_trunc('month', series) as month_ts
            FROM generate_series(
                date_trunc('month', NOW() - p_interval::interval),
                date_trunc('month', NOW()),
                '1 month'
            ) series
        )
        SELECT
            TO_CHAR(m.month_ts, 'Mon YY') as month,
            m.month_ts,
            COUNT(DISTINCT l.id) as leads,
            COUNT(DISTINCT b.id) as conversions,
            COALESCE(SUM(b.total_amount), 0) / 10000000 as revenue
        FROM months m
        LEFT JOIN leads l ON date_trunc('month', l.created_at) = m.month_ts AND l.tenant_id = p_tenant_id
        LEFT JOIN bookings b ON date_trunc('month', b.booking_date) = m.month_ts AND b.tenant_id = p_tenant_id AND b.status != 'Cancelled'
        GROUP BY m.month_ts
    ) m;

    -- ── Conversion Funnel ──
    SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json) INTO v_funnel
    FROM (
        SELECT stage, COUNT(*) as count FROM leads WHERE tenant_id = p_tenant_id
        GROUP BY stage ORDER BY
        CASE stage WHEN 'New' THEN 1 WHEN 'Contacted' THEN 2
        WHEN 'Site Visit' THEN 3 WHEN 'Negotiation' THEN 4
        WHEN 'Won' THEN 5 WHEN 'Lost' THEN 6 ELSE 7 END
    ) f;

    -- ── Agent Performance ──
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_agents
    FROM (
        SELECT u.name, u.avatar, u.role,
               COUNT(DISTINCT l.id) as total_leads,
               COUNT(DISTINCT b.id) as won,
               COALESCE(SUM(b.total_amount), 0) / 10000000 as revenue_cr,
               COUNT(DISTINCT sv.id) as site_visits
        FROM users u
        LEFT JOIN leads l ON l.assigned_to = u.id AND l.tenant_id = u.tenant_id
        LEFT JOIN bookings b ON b.assigned_agent_id = u.id AND b.tenant_id = u.tenant_id AND b.status != 'Cancelled'
        LEFT JOIN site_visits sv ON sv.assigned_agent = u.id AND sv.tenant_id = u.tenant_id
        WHERE u.tenant_id = p_tenant_id AND u.role IN ('agent', 'sales_manager')
        GROUP BY u.id ORDER BY won DESC
    ) a;

    -- ── Revenue by Project ──
    SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO v_revenue_project
    FROM (
        SELECT p.name, COUNT(b.id) as bookings, COALESCE(SUM(b.total_amount),0) / 10000000 as revenue
        FROM projects p
        LEFT JOIN bookings b ON b.project_id = p.id AND b.tenant_id = p.tenant_id AND b.status != 'Cancelled'
        WHERE p.tenant_id = p_tenant_id GROUP BY p.id ORDER BY revenue DESC
    ) r;

    -- ── Daily Activity (30 days) ──
    SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::json) INTO v_daily
    FROM (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM leads WHERE tenant_id = p_tenant_id AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
    ) d;

    -- ── Call Outcomes ──
    SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO v_call_outcomes
    FROM (
        SELECT outcome, COUNT(*) as count FROM interactions
        WHERE tenant_id = p_tenant_id AND type = 'Call' GROUP BY outcome
    ) c;

    -- ── Agent Call Stats ──
    SELECT COALESCE(json_agg(row_to_json(ac)), '[]'::json) INTO v_agent_calls
    FROM (
        SELECT u.name, COUNT(i.id) as calls, SUM(COALESCE(i.duration, 0)) as talk_time, MAX(i.date) as last_call
        FROM users u JOIN interactions i ON i.user_id = u.id
        WHERE u.tenant_id = p_tenant_id AND i.type = 'Call'
        GROUP BY u.id ORDER BY talk_time DESC
    ) ac;

    -- ── Aggregate KPIs ──
    SELECT COUNT(*) INTO v_total_leads FROM leads WHERE tenant_id = p_tenant_id;
    SELECT COUNT(*) INTO v_won_leads FROM leads WHERE tenant_id = p_tenant_id AND stage = 'Won';
    SELECT COALESCE(SUM(total_amount), 0) / 10000000 INTO v_total_revenue FROM bookings WHERE tenant_id = p_tenant_id AND status != 'Cancelled';
    SELECT COUNT(*) INTO v_total_bookings FROM bookings WHERE tenant_id = p_tenant_id AND status != 'Cancelled';
    SELECT COUNT(*) INTO v_total_calls FROM interactions WHERE tenant_id = p_tenant_id AND type = 'Call';

    -- ── Assemble Final JSON ──
    result := json_build_object(
        'kpis', json_build_object(
            'totalRevenue', v_total_revenue,
            'totalLeads', v_total_leads,
            'unitsSold', v_total_bookings,
            'conversionRate', CASE WHEN v_total_leads > 0 THEN ROUND(v_won_leads * 100.0 / v_total_leads, 1) ELSE 0 END,
            'totalCalls', v_total_calls
        ),
        'leadSources', v_lead_sources,
        'monthlySales', v_monthly,
        'pipelineDistribution', v_funnel,
        'agentPerformance', v_agents,
        'revenueByProject', v_revenue_project,
        'dailyActivity', v_daily,
        'callOutcomes', v_call_outcomes,
        'agentCalls', v_agent_calls
    );

    RETURN result;
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 3. get_telephony_analytics(tenant_id)
--    Replaces: 2 queries in telephony analytics endpoint
--    Returns: Call stats + agent leaderboard in one trip
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_telephony_analytics(
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_stats JSON;
    v_leaderboard JSON;
BEGIN
    SELECT json_build_object(
        'positive', COUNT(*) FILTER (WHERE sentiment = 'Positive'),
        'negative', COUNT(*) FILTER (WHERE sentiment = 'Negative'),
        'neutral', COUNT(*) FILTER (WHERE sentiment = 'Neutral'),
        'concerned', COUNT(*) FILTER (WHERE sentiment = 'Concerned'),
        'avg_rapport', ROUND(AVG(rapport_score)::numeric, 1),
        'avg_closing', ROUND(AVG(closing_score)::numeric, 1),
        'total_calls', COUNT(*),
        'total_duration', COALESCE(SUM(duration), 0)
    ) INTO v_stats
    FROM interactions
    WHERE tenant_id = p_tenant_id AND type = 'Call' AND date >= NOW() - INTERVAL '30 days';

    SELECT COALESCE(json_agg(row_to_json(lb)), '[]'::json) INTO v_leaderboard
    FROM (
        SELECT u.name, u.avatar,
               COUNT(i.id) as calls,
               ROUND(AVG(i.rapport_score)::numeric, 1) as rapport,
               SUM(i.duration) as talk_time
        FROM users u
        JOIN interactions i ON i.user_id = u.id
        WHERE u.tenant_id = p_tenant_id AND i.type = 'Call' AND i.date >= NOW() - INTERVAL '30 days'
        GROUP BY u.id ORDER BY calls DESC LIMIT 10
    ) lb;

    result := json_build_object(
        'stats', v_stats,
        'leaderboard', v_leaderboard
    );

    RETURN result;
END;
$$;

-- ══════════════════════════════════════════════════════════════════
-- DONE. Three high-performance stored procedures deployed:
-- 1. get_dashboard_kpis()     → 14 queries → 1 round-trip
-- 2. get_analytics_summary()  → 9 queries  → 1 round-trip
-- 3. get_telephony_analytics()→ 2 queries  → 1 round-trip
-- ══════════════════════════════════════════════════════════════════
