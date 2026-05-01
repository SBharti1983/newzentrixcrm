-- ══════════════════════════════════════════════════════════════════
-- ZentrixCRM Phase 6 Stored Procedures (REVISION 2)
-- Purpose: Power the Command Center with Predictive Intelligence (Best Time to Contact)
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_command_center_intel(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(intel)), '[]'::json) INTO result FROM (
        SELECT 
            l.id,
            l.name,
            l.phone,
            l.city,
            l.property_type as "propertyType",
            l.status,
            l.stage,
            -- Closing Probability Calculation (Neural conversion index)
            LEAST(100, GREATEST(0, (
                (CASE WHEN l.stage = 'Won' THEN 100 
                      WHEN l.stage = 'Negotiation' THEN 85
                      WHEN l.stage = 'Interested' THEN 70
                      WHEN l.stage = 'Qualified' THEN 50
                      WHEN l.stage = 'Site Visit Done' THEN 40
                      WHEN l.stage = 'Site Visit Scheduled' THEN 30
                      WHEN l.stage = 'Connected' THEN 20
                      ELSE 10 END) +
                (SELECT COALESCE(COUNT(*) * 5, 0) FROM interactions i WHERE i.lead_id = l.id) +
                (SELECT COALESCE(COUNT(*) * 15, 0) FROM site_visits sv WHERE sv.lead_id = l.id AND sv.status = 'Completed') +
                (CASE WHEN l.priority = 'High' THEN 10 ELSE 0 END)
            ))) as "closingProbability",
            -- Predictive Re-engagement: Best Time to Contact
            (
                SELECT 
                    CASE 
                        WHEN COUNT(*) = 0 THEN 'Morning (Anytime)'
                        WHEN AVG(EXTRACT(HOUR FROM date)) BETWEEN 8 AND 11 THEN 'Early Morning (8-11 AM)'
                        WHEN AVG(EXTRACT(HOUR FROM date)) BETWEEN 11 AND 14 THEN 'Noon (11 AM-2 PM)'
                        WHEN AVG(EXTRACT(HOUR FROM date)) BETWEEN 14 AND 17 THEN 'Afternoon (2-5 PM)'
                        WHEN AVG(EXTRACT(HOUR FROM date)) BETWEEN 17 AND 20 THEN 'Evening (5-8 PM)'
                        ELSE 'Late Evening (8-10 PM)'
                    END
                FROM interactions 
                WHERE lead_id = l.id
            ) as "bestTimeToContact",
            -- Sentiment Logic
            COALESCE((
                SELECT sentiment 
                FROM interactions 
                WHERE lead_id = l.id AND sentiment IS NOT NULL 
                ORDER BY date DESC LIMIT 1
            ), 'Neutral') as sentiment,
            -- Summary text
            (
                SELECT 'User is highly interested in ' || COALESCE(l.property_type, 'any') || ' projects in ' || COALESCE(l.city, 'your region') || '. ' || 
                       (SELECT COUNT(*)::text FROM interactions WHERE lead_id = l.id) || ' interactions recorded. Status: ' || l.stage || '.'
            ) as summary,
            -- Next Action
            (
                CASE 
                    WHEN (SELECT COUNT(*) FROM site_visits WHERE lead_id = l.id AND status = 'Scheduled') > 0 THEN 'Prepare for Site Visit'
                    WHEN (SELECT COUNT(*) FROM site_visits WHERE lead_id = l.id AND status = 'Completed') > 0 THEN 'Share Final Pricing'
                    WHEN l.stage = 'Qualified' THEN 'Schedule Site Visit'
                    ELSE 'Follow up on interest'
                END
            ) as "nextAction"
        FROM leads l
        WHERE l.tenant_id = p_tenant_id AND l.status = 'Active'
        ORDER BY l.updated_at DESC
        LIMIT 100
    ) intel;

    RETURN result;
END;
$$;
