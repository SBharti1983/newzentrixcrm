-- Leaderboard and Gamification Intelligence
-- Returns top agents based on conversion metrics and revenue

CREATE OR REPLACE FUNCTION get_sales_leaderboard(p_tenant_id UUID)
RETURNS TABLE (
    agent_id UUID,
    agent_name TEXT,
    agent_avatar TEXT,
    deals_closed BIGINT,
    site_visits_done BIGINT,
    revenue_generated NUMERIC,
    conversion_rate NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH AgentStats AS (
        SELECT 
            u.id as a_id,
            u.name as a_name,
            u.avatar as a_avatar,
            COUNT(DISTINCT b.id) as deals,
            COUNT(DISTINCT sv.id) as visits,
            COALESCE(SUM(b.total_amount), 0) as revenue
        FROM users u
        LEFT JOIN bookings b ON b.assigned_agent_id = u.id AND b.status = 'Approved'
        LEFT JOIN site_visits sv ON sv.assigned_to = u.id AND sv.status = 'Completed'
        WHERE u.tenant_id = p_tenant_id 
          AND u.role IN ('agent', 'sales_manager')
          AND u.is_active = TRUE
        GROUP BY u.id, u.name, u.avatar
    )
    SELECT 
        a_id,
        a_name,
        a_avatar,
        deals,
        visits,
        revenue,
        CASE 
            WHEN visits = 0 THEN 0 
            ELSE ROUND((deals::numeric / visits::numeric) * 100, 2)
        END as conversion_rate,
        RANK() OVER (ORDER BY revenue DESC, deals DESC) as rank
    FROM AgentStats
    ORDER BY rank ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
