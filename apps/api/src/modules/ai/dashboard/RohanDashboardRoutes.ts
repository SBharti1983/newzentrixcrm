/**
 * RohanDashboardRoutes — API endpoints for the AI Twin Monitoring Dashboard
 * 
 * Provides real-time stats, twin comparison, conversation review,
 * reasoning feed, feedback submission, and coaching data.
 * 
 * Mounted at: /api/v1/ai/dashboard
 */

import express, { Response } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import pool from '../../../db/pool';
import { db as firebaseDb } from '../../../utils/firebase';
import rohanAutomationEngine from '../../automation/workflows/RohanAutomationEngine';

const router = express.Router();

// ── POST /escalation-alert — Internal service-to-service alert trigger ──
router.post('/escalation-alert', async (req: any, res: Response) => {
    // Validate request using shared JWT_SECRET
    const authHeader = req.headers.authorization;
    const secret = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.secret;
    const expectedSecret = process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me';

    if (secret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized internal service request' });
    }

    const { tenant_id, lead_id, manager_id, manager_agent_id, escalation_type, context_summary, action } = req.body;

    try {
        // 1. Emit via Socket.IO for real-time dashboard popup/notifications
        if (req.io) {
            req.io.to(`user_${manager_id}`).emit('rohan:escalation_alert', {
                type: escalation_type,
                lead_id,
                context: context_summary,
                action,
                timestamp: Date.now()
            });
        }

        // 2. Push to Firebase Realtime Database for mobile handset dialing/ringing
        if (firebaseDb && manager_agent_id && action === 'warm_transfer') {
            await firebaseDb.ref(`agents/${manager_agent_id}/transfer_request`).set({
                from: 'AI Rohan',
                lead_id,
                reason: escalation_type,
                summary: context_summary.brief,
                timestamp: Date.now()
            });
        }

        // 3. Write notification to PostgreSQL database for historical alert UI
        await pool.query(
            `INSERT INTO notifications (tenant_id, user_id, title, message, type)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                tenant_id,
                manager_id,
                `🚨 AI Rohan Escalation`,
                `Rohan triggered a handoff for lead due to: ${context_summary.escalation_reason || escalation_type}. Brief: ${context_summary.brief}`,
                'Escalation'
            ]
        );

        res.json({ ok: true, message: 'Escalation alert processed successfully' });
    } catch (err: any) {
        console.error('[RohanDashboard] escalation-alert processing failed:', err);
        res.status(500).json({ error: 'Failed to process escalation alert' });
    }
});

// ── POST /automation-trigger — Internal service-to-service automation trigger ──
router.post('/automation-trigger', async (req: any, res: Response) => {
    // Validate request using shared JWT_SECRET
    const authHeader = req.headers.authorization;
    const secret = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.secret;
    const expectedSecret = process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me';

    if (secret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized internal service request' });
    }

    const { tenant_id, lead_id, action, objection, notes } = req.body;

    try {
        const result = await rohanAutomationEngine.executeTrigger({
            tenant_id: Number(tenant_id),
            lead_id,
            action,
            objection,
            notes
        });

        res.json(result);
    } catch (err: any) {
        console.error('[RohanDashboard] automation-trigger processing failed:', err);
        res.status(500).json({ error: 'Failed to process automation trigger' });
    }
});

router.use(authenticateToken);

// ── GET /live-stats — AI Rohan's current status ────────────────────
router.get('/live-stats', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;

        // Get persona info
        const { rows: persona } = await pool.query(
            `SELECT p.id, p.employee_name, p.employee_code, p.role, p.is_active,
                    u.id as user_id, u.name as user_name
             FROM ai_employee_personas p
             LEFT JOIN users u ON u.ai_persona_id = p.id
             WHERE p.tenant_id = $1 AND p.is_active = TRUE
             LIMIT 1`,
            [tenantId]
        );

        if (!persona[0]) {
            return res.json({ online: false, message: 'No active AI persona found' });
        }

        // Today's metrics
        const today = new Date().toISOString().split('T')[0];
        const { rows: metrics } = await pool.query(
            `SELECT * FROM ai_employee_metrics 
             WHERE tenant_id = $1 AND persona_id = $2 AND metric_date = $3`,
            [tenantId, persona[0].id, today]
        );

        // Active conversations (updated in last 30 min)
        const { rows: activeConvos } = await pool.query(
            `SELECT COUNT(*) as active_count FROM ai_conversation_memory
             WHERE tenant_id = $1 AND persona_id = $2 
             AND updated_at > NOW() - INTERVAL '30 minutes'`,
            [tenantId, persona[0].id]
        );

        // Today's reasoning count + avg latency
        const { rows: reasoningStats } = await pool.query(
            `SELECT COUNT(*) as total_turns,
                    COALESCE(AVG(latency_ms), 0) as avg_latency_ms,
                    COALESCE(AVG(reasoning_ms), 0) as avg_reasoning_ms
             FROM ai_reasoning_log
             WHERE tenant_id = $1 AND persona_id = $2 
             AND created_at >= CURRENT_DATE`,
            [tenantId, persona[0].id]
        );

        // Pending escalations
        const { rows: escalations } = await pool.query(
            `SELECT COUNT(*) as pending FROM ai_escalation_events
             WHERE tenant_id = $1 AND persona_id = $2 AND status = 'pending'`,
            [tenantId, persona[0].id]
        );

        // Feedback accuracy (from Human Rohan's ratings)
        const { rows: feedbackStats } = await pool.query(
            `SELECT 
                COUNT(*) as total_ratings,
                COUNT(*) FILTER (WHERE rating = 'good') as good_ratings,
                COUNT(*) FILTER (WHERE rating = 'bad') as bad_ratings
             FROM ai_feedback
             WHERE tenant_id = $1 AND persona_id = $2`,
            [tenantId, persona[0].id]
        );

        const totalRatings = parseInt(feedbackStats[0]?.total_ratings || '0');
        const goodRatings = parseInt(feedbackStats[0]?.good_ratings || '0');
        const accuracyPercent = totalRatings > 0 ? Math.round((goodRatings / totalRatings) * 100) : null;

        res.json({
            online: true,
            persona: persona[0],
            today: {
                calls_inbound: metrics[0]?.calls_inbound || 0,
                calls_outbound: metrics[0]?.calls_outbound || 0,
                whatsapp_msgs: metrics[0]?.whatsapp_msgs || 0,
                leads_qualified: metrics[0]?.leads_qualified || 0,
                escalations: parseInt(escalations[0]?.pending || '0'),
                site_visits_booked: metrics[0]?.site_visits_booked || 0,
                csat_score: metrics[0]?.csat_score || null,
            },
            reasoning: {
                total_turns: parseInt(reasoningStats[0]?.total_turns || '0'),
                avg_latency_ms: Math.round(parseFloat(reasoningStats[0]?.avg_latency_ms || '0')),
                avg_reasoning_ms: Math.round(parseFloat(reasoningStats[0]?.avg_reasoning_ms || '0')),
            },
            active_conversations: parseInt(activeConvos[0]?.active_count || '0'),
            accuracy: {
                percent: accuracyPercent,
                total_ratings: totalRatings,
                good: goodRatings,
                bad: parseInt(feedbackStats[0]?.bad_ratings || '0'),
            },
        });
    } catch (err: any) {
        console.error('[RohanDashboard] live-stats error:', err);
        res.status(500).json({ error: 'Failed to fetch live stats' });
    }
});

// ── GET /twin-comparison — Human vs AI side-by-side metrics ────────
router.get('/twin-comparison', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const days = parseInt(req.query.days as string) || 7;

        // Find AI Rohan user
        const { rows: aiUser } = await pool.query(
            `SELECT id FROM users WHERE tenant_id = $1 AND is_ai_employee = TRUE AND is_active = TRUE LIMIT 1`,
            [tenantId]
        );

        // Find Human agents (non-AI) for comparison
        const { rows: humanAgents } = await pool.query(
            `SELECT id, name FROM users 
             WHERE tenant_id = $1 AND role IN ('agent', 'sales_manager') 
             AND is_active = TRUE AND (is_ai_employee IS NULL OR is_ai_employee = FALSE)
             ORDER BY name`,
            [tenantId]
        );

        const aiUserId = aiUser[0]?.id;
        const humanIds = humanAgents.map(a => a.id);

        // AI stats from interactions
        const aiStats = aiUserId ? await getAgentStats(tenantId, aiUserId, days) : getEmptyStats();

        // Average human stats
        let humanStats = getEmptyStats();
        if (humanIds.length > 0) {
            const allHumanStats = await Promise.all(
                humanIds.map(id => getAgentStats(tenantId, id, days))
            );
            humanStats = averageStats(allHumanStats);
        }

        // Calculate match score
        const matchScore = calculateMatchScore(humanStats, aiStats);

        res.json({
            ai: { user_id: aiUserId, stats: aiStats },
            human_average: { agents: humanAgents.length, stats: humanStats },
            match_score: matchScore,
            period_days: days,
        });
    } catch (err: any) {
        console.error('[RohanDashboard] twin-comparison error:', err);
        res.status(500).json({ error: 'Failed to fetch twin comparison' });
    }
});

// ── GET /reasoning-feed — Recent AI reasoning output timeline ─────
router.get('/reasoning-feed', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
        const offset = parseInt(req.query.offset as string) || 0;
        const channel = req.query.channel as string;

        let query = `
            SELECT r.id, r.lead_id, r.turn_number, r.channel, r.user_input,
                   r.reasoning_output, r.response_given, r.latency_ms, r.reasoning_ms,
                   r.created_at, l.name as lead_name, l.phone as lead_phone
            FROM ai_reasoning_log r
            LEFT JOIN leads l ON r.lead_id = l.id
            WHERE r.tenant_id = $1
        `;
        const params: any[] = [tenantId];
        let paramIdx = 2;

        if (channel) {
            query += ` AND r.channel = $${paramIdx++}`;
            params.push(channel);
        }

        query += ` ORDER BY r.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
        params.push(limit, offset);

        const { rows } = await pool.query(query, params);

        // Total count for pagination
        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*) FROM ai_reasoning_log WHERE tenant_id = $1`,
            [tenantId]
        );

        res.json({
            items: rows,
            total: parseInt(countRows[0]?.count || '0'),
            limit,
            offset,
        });
    } catch (err: any) {
        console.error('[RohanDashboard] reasoning-feed error:', err);
        res.status(500).json({ error: 'Failed to fetch reasoning feed' });
    }
});

// ── GET /conversation/:leadId — Full transcript for a lead ────────
router.get('/conversation/:leadId', async (req: any, res: Response) => {
    try {
        const { leadId } = req.params;
        const tenantId = req.tenantId;

        const { rows: turns } = await pool.query(
            `SELECT r.turn_number, r.channel, r.user_input, r.response_given,
                    r.reasoning_output, r.latency_ms, r.reasoning_ms, r.created_at
             FROM ai_reasoning_log r
             WHERE r.tenant_id = $1 AND r.lead_id = $2
             ORDER BY r.created_at ASC`,
            [tenantId, leadId]
        );

        // Get lead info
        const { rows: lead } = await pool.query(
            `SELECT id, name, phone, email, status, stage, score FROM leads WHERE id = $1 AND tenant_id = $2`,
            [leadId, tenantId]
        );

        // Get existing feedback for these turns
        const { rows: feedback } = await pool.query(
            `SELECT reasoning_log_id, rating, correction, correction_category 
             FROM ai_feedback WHERE lead_id = $1 AND tenant_id = $2`,
            [leadId, tenantId]
        );

        const feedbackMap = new Map(feedback.map(f => [f.reasoning_log_id, f]));

        res.json({
            lead: lead[0] || null,
            turns: turns.map(t => ({
                ...t,
                feedback: feedbackMap.get(t.id) || null,
            })),
            total_turns: turns.length,
        });
    } catch (err: any) {
        console.error('[RohanDashboard] conversation error:', err);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// ── GET /escalations — Recent escalation events ───────────────────
router.get('/escalations', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { rows } = await pool.query(
            `SELECT e.*, l.name as lead_name, l.phone as lead_phone
             FROM ai_escalation_events e
             LEFT JOIN leads l ON e.lead_id = l.id
             WHERE e.tenant_id = $1
             ORDER BY e.created_at DESC
             LIMIT 20`,
            [tenantId]
        );
        res.json(rows);
    } catch (err: any) {
        console.error('[RohanDashboard] escalations error:', err);
        res.status(500).json({ error: 'Failed to fetch escalations' });
    }
});

// ── GET /coaching-gaps — Areas where AI diverges from Human ───────
router.get('/coaching-gaps', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;

        // Aggregate feedback by category
        const { rows: gaps } = await pool.query(
            `SELECT correction_category, 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE rating = 'good') as good,
                    COUNT(*) FILTER (WHERE rating = 'bad') as bad
             FROM ai_feedback
             WHERE tenant_id = $1 AND correction_category IS NOT NULL
             GROUP BY correction_category
             ORDER BY bad DESC`,
            [tenantId]
        );

        // Get teaching examples per category
        const { rows: teachings } = await pool.query(
            `SELECT category, COUNT(*) as examples_count
             FROM ai_teaching_examples
             WHERE tenant_id = $1 AND is_active = TRUE
             GROUP BY category`,
            [tenantId]
        );

        const teachingMap = new Map(teachings.map(t => [t.category, parseInt(t.examples_count)]));

        const result = gaps.map(g => {
            const total = parseInt(g.total);
            const good = parseInt(g.good);
            return {
                category: g.correction_category,
                match_percent: total > 0 ? Math.round((good / total) * 100) : 0,
                total_reviewed: total,
                good_count: good,
                bad_count: parseInt(g.bad),
                teaching_examples: teachingMap.get(g.correction_category) || 0,
            };
        });

        res.json(result);
    } catch (err: any) {
        console.error('[RohanDashboard] coaching-gaps error:', err);
        res.status(500).json({ error: 'Failed to fetch coaching gaps' });
    }
});

// ── POST /feedback — Human Rohan rates an AI conversation turn ────
router.post('/feedback', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const reviewerId = req.user.id;
        const { reasoning_log_id, lead_id, rating, correction, correction_category, ai_response, human_response } = req.body;

        if (!rating || !['good', 'bad', 'neutral'].includes(rating)) {
            return res.status(400).json({ error: 'Rating must be good, bad, or neutral' });
        }

        // Get persona
        const { rows: persona } = await pool.query(
            `SELECT id FROM ai_employee_personas WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`,
            [tenantId]
        );
        if (!persona[0]) return res.status(404).json({ error: 'No AI persona found' });

        const { rows: inserted } = await pool.query(
            `INSERT INTO ai_feedback 
                (tenant_id, persona_id, reviewer_id, reasoning_log_id, lead_id, rating, correction, correction_category, ai_response, human_response)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [tenantId, persona[0].id, reviewerId, reasoning_log_id || null, lead_id || null, rating, correction || null, correction_category || null, ai_response || null, human_response || null]
        );

        // Emit via Socket.IO for real-time dashboard updates
        if (req.io) {
            req.io.to(`tenant_${tenantId}`).emit('rohan:feedback', {
                feedback_id: inserted[0].id,
                rating,
                category: correction_category,
            });
        }

        res.status(201).json({ id: inserted[0].id, message: 'Feedback saved' });
    } catch (err: any) {
        console.error('[RohanDashboard] feedback error:', err);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// ── POST /teach — Human Rohan submits a teaching example ──────────
router.post('/teach', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const teacherId = req.user.id;
        const { category, scenario, human_response, audio_url } = req.body;

        if (!category || !scenario || !human_response) {
            return res.status(400).json({ error: 'category, scenario, and human_response are required' });
        }

        const { rows: persona } = await pool.query(
            `SELECT id FROM ai_employee_personas WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`,
            [tenantId]
        );
        if (!persona[0]) return res.status(404).json({ error: 'No AI persona found' });

        const { rows: inserted } = await pool.query(
            `INSERT INTO ai_teaching_examples 
                (tenant_id, persona_id, teacher_id, category, scenario, human_response, audio_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [tenantId, persona[0].id, teacherId, category, scenario, human_response, audio_url || null]
        );

        res.status(201).json({ id: inserted[0].id, message: 'Teaching example saved' });
    } catch (err: any) {
        console.error('[RohanDashboard] teach error:', err);
        res.status(500).json({ error: 'Failed to save teaching example' });
    }
});

// ── GET /teachings — List all teaching examples ───────────────────
router.get('/teachings', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const category = req.query.category as string;

        let query = `
            SELECT t.*, u.name as teacher_name
            FROM ai_teaching_examples t
            LEFT JOIN users u ON t.teacher_id = u.id
            WHERE t.tenant_id = $1 AND t.is_active = TRUE
        `;
        const params: any[] = [tenantId];

        if (category) {
            query += ` AND t.category = $2`;
            params.push(category);
        }

        query += ` ORDER BY t.created_at DESC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err: any) {
        console.error('[RohanDashboard] teachings error:', err);
        res.status(500).json({ error: 'Failed to fetch teachings' });
    }
});

// ── Helper Functions ──────────────────────────────────────────────

async function getAgentStats(tenantId: string, userId: string, days: number) {
    const { rows } = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE type = 'Call') as calls,
            COUNT(*) FILTER (WHERE type = 'WhatsApp') as whatsapp,
            COUNT(*) as total_interactions,
            COUNT(DISTINCT lead_id) as leads_contacted
        FROM interactions
        WHERE tenant_id = $1 AND user_id = $2 
        AND created_at >= NOW() - make_interval(days => $3)
    `, [tenantId, userId, days]);

    const { rows: followupRows } = await pool.query(`
        SELECT COUNT(*) as completed FROM followups
        WHERE tenant_id = $1 AND assigned_to = $2 AND status = 'Completed'
        AND created_at >= NOW() - make_interval(days => $3)
    `, [tenantId, userId, days]);

    const { rows: leadRows } = await pool.query(`
        SELECT COUNT(*) as total, 
               COUNT(*) FILTER (WHERE stage IN ('Qualified', 'Won', 'Booking')) as qualified
        FROM leads
        WHERE tenant_id = $1 AND assigned_to = $2
    `, [tenantId, userId]);

    return {
        calls: parseInt(rows[0]?.calls || '0'),
        whatsapp: parseInt(rows[0]?.whatsapp || '0'),
        total_interactions: parseInt(rows[0]?.total_interactions || '0'),
        leads_contacted: parseInt(rows[0]?.leads_contacted || '0'),
        followups_completed: parseInt(followupRows[0]?.completed || '0'),
        total_leads: parseInt(leadRows[0]?.total || '0'),
        qualified_leads: parseInt(leadRows[0]?.qualified || '0'),
        qualification_rate: parseInt(leadRows[0]?.total || '0') > 0
            ? Math.round((parseInt(leadRows[0]?.qualified || '0') / parseInt(leadRows[0]?.total || '0')) * 100)
            : 0,
    };
}

function getEmptyStats() {
    return { calls: 0, whatsapp: 0, total_interactions: 0, leads_contacted: 0, followups_completed: 0, total_leads: 0, qualified_leads: 0, qualification_rate: 0 };
}

function averageStats(statsArray: any[]) {
    if (statsArray.length === 0) return getEmptyStats();
    const avg: any = {};
    const keys = Object.keys(statsArray[0]);
    for (const key of keys) {
        avg[key] = Math.round(statsArray.reduce((sum, s) => sum + (s[key] || 0), 0) / statsArray.length);
    }
    return avg;
}

function calculateMatchScore(human: any, ai: any) {
    if (!human || !ai) return 0;
    let score = 0;
    let factors = 0;

    // Compare each metric — closer to human = higher score
    const metrics = ['qualification_rate', 'calls', 'whatsapp', 'followups_completed'];
    for (const m of metrics) {
        if (human[m] > 0) {
            const ratio = Math.min(ai[m] / human[m], 2); // Cap at 200%
            score += Math.min(ratio, 1) * 100; // 0-100 per metric
            factors++;
        }
    }

    return factors > 0 ? Math.round(score / factors) : 0;
}

export default router;
