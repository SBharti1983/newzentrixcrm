-- ══════════════════════════════════════════════════════════════════
-- ZentrixCRM Superadmin Stored Procedure
-- Purpose: Resolve N+2 sequential network waterfall on the 
--          Superadmin Global Dashboard.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_superadmin_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
    v_tenants INT;
    v_users INT;
    v_revenue NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_tenants FROM tenants;
    SELECT COUNT(*) INTO v_users FROM users;
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue FROM subscriptions WHERE status = 'active';

    result := json_build_object(
        'totalTenants', v_tenants,
        'totalUsers', v_users,
        'mrr', v_revenue
    );

    RETURN result;
END;
$$;
