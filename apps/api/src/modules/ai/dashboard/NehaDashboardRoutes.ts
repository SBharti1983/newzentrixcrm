/**
 * NehaDashboardRoutes — REST API endpoints for the Neha Orchestration
 * Platform dashboard.
 *
 * Provides aggregate stats, filing task kanban, reasoning feed,
 * handoff/escalation history, and live call activity for Neha (AI
 * Digital Accountant).
 *
 * Mounted at: /api/v1/neha/dashboard
 *
 * Auth: user JWT (authenticateToken) — same as other dashboard routes.
 * Real-time push is handled separately by NehaEventRoutes via Socket.IO.
 */

import express, { Response } from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../../../middleware/auth';
import pool from '../../../db/pool';
import { logger } from '@zentrix/logger';

const router = express.Router();

// ── Helper: resolve Neha persona_id for the tenant ──────────────────
async function getNehaPersonaId(tenantId: string): Promise<string | null> {
    try {
        const { rows } = await pool.query(
            `SELECT id FROM ai_employee_personas
             WHERE tenant_id = $1 AND role = 'neha'
             LIMIT 1`,
            [tenantId]
        );
        return rows[0]?.id || null;
    } catch {
        return null;
    }
}

// ── GET /stats — KPI cards (filings, handoffs, turns, avg latency) ──
router.get('/stats', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;
    const days = parseInt(req.query.days as string) || 7;

    try {
        const personaId = await getNehaPersonaId(tenantId);
        const since = new Date(Date.now() - days * 86400_000).toISOString();

        // Filing stats
        const filingStats = await pool.query(
            `SELECT
                COUNT(*) AS total_filings,
                COUNT(*) FILTER (WHERE status = 'filed') AS filed,
                COUNT(*) FILTER (WHERE status IN ('documents_requested', 'documents_received', 'prepared', 'pending_authorization')) AS in_progress,
                COUNT(*) FILTER (WHERE status = 'draft') AS draft,
                COUNT(*) FILTER (WHERE status IN ('rejected', 'cancelled')) AS cancelled
             FROM ai_filing_tasks
             WHERE tenant_id = $1 AND created_at >= $2`,
            [tenantId, since]
        );

        // Reasoning / turn stats
        const turnStats = await pool.query(
            `SELECT
                COUNT(*) AS total_turns,
                AVG(latency_ms) AS avg_latency_ms,
                AVG(reasoning_ms) AS avg_reasoning_ms,
                MAX(latency_ms) AS max_latency_ms
             FROM ai_reasoning_log
             WHERE tenant_id = $1 AND created_at >= $2
             ${personaId ? 'AND persona_id = $3' : ''}`,
            personaId ? [tenantId, since, personaId] : [tenantId, since]
        );

        // Handoff / escalation stats
        const handoffStats = await pool.query(
            `SELECT
                COUNT(*) AS total_handoffs,
                COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending
             FROM ai_escalation_events
             WHERE tenant_id = $1 AND created_at >= $2
             ${personaId ? 'AND persona_id = $3' : ''}`,
            personaId ? [tenantId, since, personaId] : [tenantId, since]
        );

        // Action distribution (what Neha is doing)
        const actionDist = await pool.query(
            `SELECT
                reasoning_output->>'action' AS action,
                COUNT(*) AS count
             FROM ai_reasoning_log
             WHERE tenant_id = $1 AND created_at >= $2
             ${personaId ? 'AND persona_id = $3' : ''}
             GROUP BY reasoning_output->>'action'
             ORDER BY count DESC`,
            personaId ? [tenantId, since, personaId] : [tenantId, since]
        );

        res.json({
            window_days: days,
            filings: filingStats.rows[0] || {},
            turns: turnStats.rows[0] || {},
            handoffs: handoffStats.rows[0] || {},
            action_distribution: actionDist.rows || [],
        });
    } catch (err: any) {
        logger.error(`[NehaDashboard] GET /stats failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch Neha stats' });
    }
});

// ── GET /filings — Filing task kanban (grouped by status) ───────────
router.get('/filings', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const status = req.query.status as string | undefined;

    try {
        const params: any[] = [tenantId];
        let statusFilter = '';
        if (status) {
            params.push(status);
            statusFilter = 'AND status = $2';
        }

        const { rows } = await pool.query(
            `SELECT
                id, filing_type, gst_return_type, period, status,
                required_documents, collected_documents, notes,
                customer_id, lead_id, assigned_to_user_id,
                filing_reference, filed_at, created_at, updated_at
             FROM ai_filing_tasks
             WHERE tenant_id = $1 ${statusFilter}
             ORDER BY created_at DESC
             LIMIT ${limit}`,
            params
        );

        // Group by status for kanban view
        const kanban: Record<string, any[]> = {};
        for (const row of rows) {
            if (!kanban[row.status]) kanban[row.status] = [];
            kanban[row.status].push(row);
        }

        res.json({
            total: rows.length,
            kanban,
            filings: rows,
        });
    } catch (err: any) {
        logger.error(`[NehaDashboard] GET /filings failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch filings' });
    }
});

// ── GET /reasoning-feed — Recent reasoning log entries ──────────────
router.get('/reasoning-feed', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

    try {
        const personaId = await getNehaPersonaId(tenantId);

        const { rows } = await pool.query(
            `SELECT
                id, turn_number, channel, user_input,
                reasoning_output->>'action'   AS action,
                reasoning_output->>'intent'   AS intent,
                reasoning_output->>'emotion'  AS emotion,
                reasoning_output->>'next_goal' AS next_goal,
                response_given,
                latency_ms, reasoning_ms,
                created_at
             FROM ai_reasoning_log
             WHERE tenant_id = $1
             ${personaId ? 'AND persona_id = $2' : ''}
             ORDER BY created_at DESC
             LIMIT ${limit}`,
            personaId ? [tenantId, personaId] : [tenantId]
        );

        res.json({ items: rows, count: rows.length });
    } catch (err: any) {
        logger.error(`[NehaDashboard] GET /reasoning-feed failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch reasoning feed' });
    }
});

// ── GET /handoffs — Escalation / handoff history ────────────────────
router.get('/handoffs', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    try {
        const personaId = await getNehaPersonaId(tenantId);

        const { rows } = await pool.query(
            `SELECT
                id, escalation_type, trigger_reason, status,
                lead_id, memory_id, metadata,
                created_at
             FROM ai_escalation_events
             WHERE tenant_id = $1
             ${personaId ? 'AND persona_id = $2' : ''}
             ORDER BY created_at DESC
             LIMIT ${limit}`,
            personaId ? [tenantId, personaId] : [tenantId]
        );

        res.json({ items: rows, count: rows.length });
    } catch (err: any) {
        logger.error(`[NehaDashboard] GET /handoffs failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch handoffs' });
    }
});

// ── GET /live-calls — Active conversation sessions ──────────────────
// Returns recent conversation memory sessions (proxy for "live calls").
router.get('/live-calls', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    try {
        const personaId = await getNehaPersonaId(tenantId);

        const { rows } = await pool.query(
            `SELECT
                m.id, m.lead_id, m.channel,
                m.conversation_state->>'turn_count' AS turn_count,
                m.conversation_state->>'language_detected' AS language,
                m.conversation_state->>'current_goal' AS current_goal,
                m.conversation_state->>'next_action' AS next_action,
                m.created_at, m.expires_at,
                (SELECT COUNT(*) FROM ai_reasoning_log r
                    WHERE r.memory_id = m.id) AS reasoning_turns
             FROM ai_conversation_memory m
             WHERE m.tenant_id = $1
             ${personaId ? 'AND m.persona_id = $2' : ''}
             ORDER BY m.created_at DESC
             LIMIT ${limit}`,
            personaId ? [tenantId, personaId] : [tenantId]
        );

        res.json({ items: rows, count: rows.length });
    } catch (err: any) {
        logger.error(`[NehaDashboard] GET /live-calls failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch live calls' });
    }
});

// ── GET /persona — Neha persona config for the dashboard header ─────
router.get('/persona', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;

    try {
        const { rows } = await pool.query(
            `SELECT id, name, role, persona_config, voice_config,
                    knowledge_scope, escalation_rules, status,
                    is_active, created_at
             FROM ai_employee_personas
             WHERE tenant_id = $1 AND role = 'neha'
             LIMIT 1`,
            [tenantId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Neha persona not found' });
        }

        res.json({ persona: rows[0] });
    } catch (err: any) {
        logger.error(`[NehaDashboard] GET /persona failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch Neha persona' });
    }
});

// ── POST /trigger-demo — Triggers a simulated filing progress loop for interactive demo ──
router.post('/trigger-demo', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id;
    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant_id' });
    }

    try {
        const personaId = await getNehaPersonaId(tenantId);
        if (!personaId) {
            return res.status(404).json({ error: 'Neha persona not found for this tenant' });
        }

        const taskId = crypto.randomUUID();
        const requiredDocs = JSON.stringify(['outward_supplies_register', 'pan_card', 'business_address_proof']);
        const collectedDocs = JSON.stringify(['pan_card', 'business_address_proof']);

        // 1. Insert filing task row into database
        await pool.query(
            `INSERT INTO ai_filing_tasks (
                id, tenant_id, persona_id, filing_type, gst_return_type, period,
                status, required_documents, collected_documents, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
                taskId,
                tenantId,
                personaId,
                'gst',
                'GSTR-1',
                'July 2025',
                'draft',
                requiredDocs,
                collectedDocs
            ]
        );

        logger.info(`[NehaDashboard] Created demo filing task: ${taskId}`);

        // 2. Define filing progress steps
        const steps = [
            { msg: 'Opening GST Portal (https://services.gst.gov.in/services/login)...', status: 'draft' },
            { msg: 'Entering credentials for user authentication...', status: 'draft' },
            { msg: 'Navigating to Returns Dashboard and verifying tax period July 2025...', status: 'documents_requested' },
            { msg: 'Extracting and parsing Outward Supplies Register spreadsheet...', status: 'documents_received' },
            { msg: 'Uploading sales invoice records (24 invoices parsed)...', status: 'prepared' },
            { msg: 'Validating GSTR-1 summaries and tax calculations...', status: 'pending_authorization' },
            { msg: 'Generating GSTR-1 draft and signing return submission...', status: 'filed' },
            { msg: 'Return submitted successfully! Confirmation sent to customer.', status: 'confirmation_sent' }
        ];

        // 3. Detached async simulation loop
        (async () => {
            const room = `tenant_${tenantId}`;

            // Emit initial created event
            if (req.io) {
                req.io.to(room).emit('neha:event', {
                    type: 'neha:filing_created',
                    tenant_id: tenantId,
                    persona_id: personaId,
                    filing_type: 'gst',
                    gst_return_type: 'GSTR-1',
                    period: 'July 2025',
                    timestamp: Date.now()
                });
            }

            for (let i = 0; i < steps.length; i++) {
                // Wait 4 seconds between steps to visually demonstrate the progress sequence
                await new Promise((resolve) => setTimeout(resolve, 4000));
                const step = steps[i];

                try {
                    // Update task status in DB
                    await pool.query(
                        `UPDATE ai_filing_tasks 
                         SET status = $1, updated_at = NOW() 
                         WHERE id = $2`,
                        [step.status, taskId]
                    );

                    // Broadcast progress update event
                    if (req.io) {
                        req.io.to(room).emit('neha:event', {
                            type: 'neha:filing_progress',
                            tenant_id: tenantId,
                            persona_id: personaId,
                            action: step.msg,
                            filing_type: 'gst',
                            gst_return_type: 'GSTR-1',
                            timestamp: Date.now()
                        });
                    }

                    logger.info(`[NehaDashboard] Demo task ${taskId} progressed to: ${step.status} - "${step.msg}"`);
                } catch (err: any) {
                    logger.error(`[NehaDashboard] Demo simulation step failed: ${err.message}`);
                }
            }
        })();

        res.json({ ok: true, taskId });
    } catch (err: any) {
        logger.error(`[NehaDashboard] POST /trigger-demo failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to trigger demo filing' });
    }
});

export default router;
