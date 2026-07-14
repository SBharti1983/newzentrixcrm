import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function createStoredProcedures() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('⏳ Creating Stored Procedures...');

        // 1. Calculate Commission (Triggered on Booking)
        await client.query(`
            CREATE OR REPLACE PROCEDURE calculate_commission(p_booking_id UUID, p_tenant_id UUID)
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_deal_value DECIMAL;
                v_agent_id UUID;
                v_partner_id UUID;
                v_lead_id UUID;
                v_agent_comm DECIMAL;
                v_partner_comm DECIMAL;
            BEGIN
                -- Get booking and lead info
                SELECT 
                    b.total_amount, l.assigned_to, l.channel_partner_id, l.id
                INTO 
                    v_deal_value, v_agent_id, v_partner_id, v_lead_id
                FROM bookings b
                JOIN customers c ON b.customer_id = c.id
                JOIN leads l ON c.lead_id = l.id
                WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id;

                -- Internal Commission (Agent) - 1.5%
                IF v_agent_id IS NOT NULL THEN
                    v_agent_comm := v_deal_value * 0.015;
                    INSERT INTO commissions (tenant_id, entity_type, entity_id, lead_id, booking_id, deal_value, commission_rate, payout_amount, status)
                    VALUES (p_tenant_id, 'Internal', v_agent_id, v_lead_id, p_booking_id, v_deal_value, 1.5, v_agent_comm, 'Pending');
                END IF;

                -- Channel Partner Commission - 2.0%
                IF v_partner_id IS NOT NULL THEN
                    v_partner_comm := v_deal_value * 0.02;
                    INSERT INTO commissions (tenant_id, entity_type, entity_id, lead_id, booking_id, deal_value, commission_rate, payout_amount, status)
                    VALUES (p_tenant_id, 'Channel Partner', v_partner_id, v_lead_id, p_booking_id, v_deal_value, 2.0, v_partner_comm, 'Pending');
                END IF;

                COMMIT;
            END;
            $$;
        `);
        console.log('✅ Created PROCEDURE calculate_commission');

        // 2. Assign Lead Round Robin
        await client.query(`
            CREATE OR REPLACE FUNCTION assign_lead_round_robin(p_tenant_id UUID, p_lead_id UUID)
            RETURNS UUID
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_selected_user_id UUID;
            BEGIN
                -- Find the agent who was assigned a lead least recently
                SELECT u.id INTO v_selected_user_id
                FROM users u
                WHERE u.tenant_id = p_tenant_id 
                  AND u.role IN ('agent', 'sales_agent') 
                  AND u.is_active = TRUE
                ORDER BY (
                    SELECT MAX(created_at) FROM leads WHERE assigned_to = u.id
                ) ASC NULLS FIRST
                LIMIT 1;

                -- If an agent is found, assign the lead
                IF v_selected_user_id IS NOT NULL THEN
                    UPDATE leads 
                    SET assigned_to = v_selected_user_id, updated_at = NOW()
                    WHERE id = p_lead_id;
                END IF;

                RETURN v_selected_user_id;
            END;
            $$;
        `);
        console.log('✅ Created FUNCTION assign_lead_round_robin');

        // 3. Lead Scoring Engine (Calculates purely on DB side)
        await client.query(`
            CREATE OR REPLACE FUNCTION score_lead(p_lead_id UUID)
            RETURNS INT
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_score INT := 0;
                v_stage VARCHAR;
                v_interactions_count INT;
                v_has_budget BOOLEAN;
            BEGIN
                -- Get lead base data
                SELECT stage, (budget IS NOT NULL) INTO v_stage, v_has_budget
                FROM leads WHERE id = p_lead_id;

                -- Get interaction count
                SELECT COUNT(*) INTO v_interactions_count
                FROM interactions WHERE lead_id = p_lead_id;

                -- Scoring logic
                IF v_stage = 'New' THEN v_score := 10; END IF;
                IF v_stage = 'Contacted' THEN v_score := 30; END IF;
                IF v_stage = 'Qualified' THEN v_score := 60; END IF;
                IF v_stage = 'Negotiation' THEN v_score := 80; END IF;
                IF v_stage = 'Won' THEN v_score := 100; END IF;
                IF v_stage = 'Lost' THEN v_score := 0; END IF;

                -- Modifiers
                IF v_has_budget THEN v_score := v_score + 10; END IF;
                v_score := v_score + (v_interactions_count * 5);

                -- Cap at 100
                IF v_score > 100 THEN v_score := 100; END IF;

                -- Update the lead
                UPDATE leads SET score = v_score WHERE id = p_lead_id;

                RETURN v_score;
            END;
            $$;
        `);
        console.log('✅ Created FUNCTION score_lead');

        await client.query('COMMIT');
        console.log('🚀 All Stored Procedures created successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create stored procedures:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

createStoredProcedures();
