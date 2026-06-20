-- ══════════════════════════════════════════════════════════════════
-- ZentrixCRM Leads & Contact Details Stored Procedures
-- Purpose: Offload massive nested JSON aggregations and Recursive CTEs
-- to the database layer for the Leads and Contact Details pages.
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. get_lead_details(p_lead_id, p_tenant_id)
--    Replaces: 70-line raw SQL query in GET /api/leads/:id
--    Returns: Single JSON object with lead data + 6 nested relations
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_lead_details(
    p_lead_id UUID,
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT row_to_json(lead_data) INTO result
    FROM (
        SELECT l.*, cust_map.id as customer_id, u.name as agent_name, u.avatar as agent_avatar, u.role as agent_role, u.phone as agent_phone, u.email as agent_email,
            p.name as project_name,
            (SELECT u2.name FROM activity_log al JOIN users u2 ON al.user_id = u2.id WHERE al.entity_id::uuid = l.id AND al.entity_type = 'lead' AND al.action = 'created' LIMIT 1) as created_by_name,
            
            -- Interactions & System Logs
            (
                SELECT COALESCE(json_agg(merged_activity ORDER BY date DESC), '[]'::json)
                FROM (
                    SELECT id, type, date, note, 
                           (SELECT name FROM users WHERE id = interactions.user_id) as agent_name,
                           'interaction' as entry_type
                    FROM interactions WHERE lead_id = l.id
                    UNION ALL
                    SELECT id, 
                           CASE 
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'budget' IS DISTINCT FROM old_data::jsonb->>'budget') THEN 'Budget Update'
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'stage' IS DISTINCT FROM old_data::jsonb->>'stage') THEN 'Stage Advance'
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'status' IS DISTINCT FROM old_data::jsonb->>'status') THEN 'Status Change'
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'property_type' IS DISTINCT FROM old_data::jsonb->>'property_type') THEN 'Property Update'
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'project_id' IS DISTINCT FROM old_data::jsonb->>'project_id') THEN 'Project Pivot'
                             ELSE INITCAP(action)
                           END as type,
                           created_at as date, 
                           CASE 
                             WHEN LOWER(TRIM(action)) = 'booking_created' THEN 'Deal Booked: ' || COALESCE(new_data::jsonb->>'unit_no', 'N/A') || ' (' || COALESCE(new_data::jsonb->>'total_amount', '0') || ')'
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'budget' IS DISTINCT FROM old_data::jsonb->>'budget') THEN 'Budget updated to ' || COALESCE(new_data::jsonb->>'budget', 'None')
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'stage' IS DISTINCT FROM old_data::jsonb->>'stage') THEN 'Stage advanced to ' || COALESCE(new_data::jsonb->>'stage', 'None')
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'property_type' IS DISTINCT FROM old_data::jsonb->>'property_type') THEN 'Property Type updated to ' || COALESCE(new_data::jsonb->>'property_type', 'None')
                             WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'project_id' IS DISTINCT FROM old_data::jsonb->>'project_id') THEN 'Target Project updated'
                             ELSE action 
                           END as note,
                           (SELECT name FROM users WHERE id = activity_log.user_id) as agent_name,
                           'system' as entry_type
                    FROM activity_log 
                    WHERE ((entity_type = 'lead' AND entity_id::uuid = l.id) OR (entity_type = 'contact' AND entity_id::uuid = l.id))
                      AND (
                        LOWER(TRIM(action)) != 'updated' 
                        OR (new_data::jsonb->>'budget' IS DISTINCT FROM old_data::jsonb->>'budget')
                        OR (new_data::jsonb->>'stage' IS DISTINCT FROM old_data::jsonb->>'stage')
                        OR (new_data::jsonb->>'status' IS DISTINCT FROM old_data::jsonb->>'status')
                        OR (new_data::jsonb->>'property_type' IS DISTINCT FROM old_data::jsonb->>'property_type')
                        OR (new_data::jsonb->>'project_id' IS DISTINCT FROM old_data::jsonb->>'project_id')
                      )
                ) merged_activity
            ) as interactions,
            
            -- Deals / Bookings
            (
                SELECT COALESCE(json_agg(deal), '[]'::json) FROM (
                    SELECT b.id, b.status, b.total_amount, COALESCE(i.unit_no, b.unit_no) as unit_number, i.floor, proj.name as project_name
                    FROM bookings b
                    JOIN customers c ON b.customer_id = c.id
                    LEFT JOIN inventory i ON b.inventory_id = i.id
                    LEFT JOIN projects proj ON b.project_id = proj.id
                    WHERE c.lead_id = l.id
                ) deal
            ) as deals,
            
            -- Pending Followups
            (
                SELECT COALESCE(json_agg(f), '[]'::json) FROM (
                    SELECT id, type, scheduled_at, status, note, priority
                    FROM followups WHERE lead_id = l.id AND status = 'Pending'
                    ORDER BY scheduled_at ASC LIMIT 5
                ) f
            ) as followups,
            
            -- Agent Hierarchy (Manager Chain)
            (
                WITH RECURSIVE hierarchy AS (
                    SELECT id, name, avatar, role, phone, email, reports_to FROM users WHERE id = l.assigned_to
                    UNION ALL
                    SELECT u.id, u.name, u.avatar, u.role, u.phone, u.email, u.reports_to
                    FROM users u
                    INNER JOIN hierarchy h ON h.reports_to = u.id
                )
                SELECT COALESCE(json_agg(h), '[]'::json) FROM hierarchy h
            ) as team
            
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN projects p ON l.project_id = p.id
        LEFT JOIN customers cust_map ON cust_map.lead_id = l.id
        WHERE l.id = p_lead_id AND l.tenant_id = p_tenant_id
    ) lead_data;

    RETURN result;
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 2. get_downline_ids(p_user_id)
--    Replaces: Inline Recursive CTEs and UNIONs scattered across routes
--    Returns: Array of UUIDs representing the user and everyone who 
--             reports to them (direct or indirect).
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_downline_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result UUID[];
BEGIN
    WITH RECURSIVE downline AS (
        -- Base case: the user themselves
        SELECT id FROM users WHERE id = p_user_id
        UNION
        -- Recursive case: anyone reporting to a user already in the downline
        SELECT u.id 
        FROM users u
        INNER JOIN downline d ON u.reports_to = d.id
    )
    SELECT array_agg(id) INTO result FROM downline;
    
    RETURN result;
END;
$$;
