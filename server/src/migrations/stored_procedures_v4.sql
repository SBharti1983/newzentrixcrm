-- ══════════════════════════════════════════════════════════════════
-- ZentrixCRM Phase 4 Stored Procedures
-- Purpose: Eliminate all remaining Promise.all parallel queries across
-- Dashboard Heatmaps, AI Copilot, Global Search, and Bookings.
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. get_dashboard_supplementary(tenant_id, target_user_id, downline_ids, is_personal)
--    Replaces: 5 parallel queries in dashboard.ts
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_supplementary(
    p_tenant_id UUID,
    p_target_user_id UUID,
    p_downline_ids UUID[],
    p_is_personal BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_project_heatmap JSON;
    v_agent_heatmap JSON;
    v_assigned_team JSON;
    v_academy JSON;
    v_members JSON;
BEGIN
    -- Project Sentiment Heatmap
    SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json) INTO v_project_heatmap FROM (
        SELECT p as project_name,
               COUNT(*) filter (where sentiment = 'Positive') as positive,
               COUNT(*) filter (where sentiment = 'Neutral') as neutral,
               COUNT(*) filter (where sentiment = 'Concerned') as concerned,
               COUNT(*) filter (where sentiment = 'Negative') as negative
        FROM interactions i, unnest(i.projects_discussed) p
        WHERE i.tenant_id = p_tenant_id AND i.sentiment IS NOT NULL
        GROUP BY p
    ) p;

    -- Agent Sentiment Heatmap
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_agent_heatmap FROM (
        SELECT u.name as agent_name,
               COUNT(*) filter (where i.sentiment = 'Positive') as positive,
               COUNT(*) filter (where i.sentiment = 'Neutral') as neutral,
               COUNT(*) filter (where i.sentiment = 'Concerned') as concerned,
               COUNT(*) filter (where i.sentiment = 'Negative') as negative
        FROM interactions i JOIN users u ON i.user_id = u.id
        WHERE i.tenant_id = p_tenant_id AND i.sentiment IS NOT NULL
        GROUP BY u.id, u.name
    ) a;

    -- Assigned Team (Global Manager view only)
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_assigned_team FROM (
        SELECT u.id, u.name, u.role, u.avatar, u.email, u.phone, u.reports_to as manager_id
        FROM users u
        WHERE u.tenant_id = p_tenant_id AND u.is_active = TRUE
        AND (u.id = p_target_user_id OR u.reports_to = p_target_user_id OR u.id = (SELECT reports_to FROM users WHERE id = p_target_user_id))
        LIMIT 5
    ) t;

    -- Academy Stats for Target User
    SELECT json_build_object(
        'total_xp', COALESCE(xp, 0), 'level', COALESCE(level, 1), 'rank_title', rank_title,
        'certifications', (SELECT COUNT(*) FROM training_progress WHERE user_id = p_target_user_id AND is_certified = TRUE),
        'avg_sim_score', (SELECT COALESCE(ROUND(AVG(best_score)), 0) FROM training_progress WHERE user_id = p_target_user_id AND best_score > 0),
        'leaderboard', (SELECT COALESCE(json_agg(lb), '[]'::json) FROM (SELECT id, name, avatar, xp, level, rank_title FROM users WHERE tenant_id = p_tenant_id AND is_active = TRUE ORDER BY xp DESC LIMIT 5) lb)
    ) INTO v_academy FROM users WHERE id = p_target_user_id;

    -- Members Downline Data (Only if not personal)
    IF NOT p_is_personal THEN
        SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json) INTO v_members FROM (
            SELECT u.id, u.name, u.avatar, u.role,
                   (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id AND stage NOT IN ('Won','Lost')) as active_leads,
                   (SELECT COUNT(*) FROM bookings WHERE assigned_agent_id = u.id AND status != 'Cancelled') as bookings,
                   COALESCE((SELECT SUM(total_amount) FROM bookings WHERE assigned_agent_id = u.id AND status != 'Cancelled'), 0) as total_value,
                   (SELECT ROUND(COUNT(*) FILTER (WHERE stage = 'Won') * 100.0 / NULLIF(COUNT(*),0), 1) FROM leads WHERE assigned_to = u.id) as win_rate
            FROM users u
            WHERE u.tenant_id = p_tenant_id AND u.is_active = TRUE
            AND (array_length(p_downline_ids, 1) IS NULL OR u.id = ANY(p_downline_ids))
            ORDER BY active_leads DESC
        ) m;
    ELSE
        v_members := '[]'::json;
    END IF;

    result := json_build_object(
        'heatmap', json_build_object('projects', v_project_heatmap, 'agents', v_agent_heatmap),
        'assigned_team', v_assigned_team,
        'academy', v_academy,
        'members', v_members
    );

    RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 2. get_copilot_context(p_lead_id, p_tenant_id)
--    Replaces: 3 parallel queries in ai.ts
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_copilot_context(
    p_lead_id UUID,
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_lead JSON;
    v_interactions JSON;
    v_project JSON;
    v_project_id UUID;
BEGIN
    SELECT row_to_json(l) INTO v_lead FROM (
        SELECT id, name, stage, source, budget, property_type, assigned_to, project_id, phone, email
        FROM leads WHERE id = p_lead_id AND tenant_id = p_tenant_id
    ) l;

    v_project_id := (v_lead->>'project_id')::uuid;

    SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json) INTO v_interactions FROM (
        SELECT type, date, note, sentiment, transcript,
               (SELECT name FROM users WHERE id = interactions.user_id) as agent_name
        FROM interactions WHERE lead_id = p_lead_id
        ORDER BY date DESC LIMIT 10
    ) i;

    IF v_project_id IS NOT NULL THEN
        SELECT row_to_json(p) INTO v_project FROM (
            SELECT name, location, status, amenities FROM projects WHERE id = v_project_id
        ) p;
    ELSE
        v_project := NULL;
    END IF;

    result := json_build_object(
        'lead', v_lead,
        'interactions', v_interactions,
        'project', v_project
    );

    RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 3. global_search(p_tenant_id, p_query)
--    Replaces: 2 parallel queries in search.ts
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION global_search(
    p_tenant_id UUID,
    p_query TEXT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_leads JSON;
    v_projects JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(l)), '[]'::json) INTO v_leads FROM (
        SELECT id, name, email, phone, stage, priority
        FROM leads
        WHERE tenant_id = p_tenant_id 
        AND (name ILIKE '%' || p_query || '%' OR phone ILIKE '%' || p_query || '%' OR email ILIKE '%' || p_query || '%')
        LIMIT 10
    ) l;

    SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json) INTO v_projects FROM (
        SELECT id, name, location, status
        FROM projects
        WHERE tenant_id = p_tenant_id AND name ILIKE '%' || p_query || '%'
        LIMIT 5
    ) p;

    result := json_build_object(
        'leads', v_leads,
        'projects', v_projects
    );

    RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 4. get_booking_details(p_booking_id, p_tenant_id)
--    Replaces: 2 parallel queries in bookings.ts
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_booking_details(
    p_booking_id UUID,
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT row_to_json(b_data) INTO result FROM (
        SELECT b.*, 
               p.name as project_name, 
               c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               i.unit_no as inventory_unit_no,
               (
                   SELECT COALESCE(json_agg(row_to_json(inst)), '[]'::json) 
                   FROM (
                       SELECT * FROM installments WHERE booking_id = b.id ORDER BY due_date ASC
                   ) inst
               ) as installments
        FROM bookings b
        JOIN projects p ON b.project_id = p.id
        JOIN customers c ON b.customer_id = c.id
        LEFT JOIN inventory i ON b.inventory_id = i.id
        WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id
    ) b_data;

    RETURN result;
END;
$$;
