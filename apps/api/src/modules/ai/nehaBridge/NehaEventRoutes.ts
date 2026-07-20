/**
 * NehaEventRoutes — Receives real-time lifecycle events from the
 * digital-employee's EventBroadcaster and fans them out via Socket.IO
 * to all connected NehaDashboard clients in the tenant room.
 *
 * Mounted at: /api/v1/neha/events
 *
 * Auth: service-to-service — validated against JWT_SECRET (same pattern
 * as RohanDashboardRoutes /escalation-alert). The digital-employee does
 * NOT hold user JWTs, so we use the shared secret instead.
 *
 * Event flow:
 *   NehaCognitiveLoop → EventBroadcaster.emit()
 *     → POST /api/v1/neha/events  (this route)
 *       → req.io.to(`tenant_${tenant_id}`).emit('neha:event', payload)
 *         → NehaDashboard.tsx Socket.IO client receives & renders live
 */

import express, { Response } from 'express';
import { logger } from '@zentrix/logger';
import rohanAutomationEngine from '../../automation/workflows/RohanAutomationEngine';

const router = express.Router();

// ── Track B reasoning actions that should fire CRM automations ──────
// When a reasoning_complete event carries one of these `action` values,
// the NehaEventRoutes automatically forwards it to RohanAutomationEngine
// so the CRM workflow (send brochure / schedule visit / escalate) fires
// without any manual dashboard trigger.
const AUTOMATABLE_ACTIONS = new Set([
    'send_document',
    'schedule_visit',
    'escalate_to_human',
]);

/**
 * Maps an inbound reasoning_complete event (either the legacy `neha:*` or
 * the generalized `employee:*` shape) to a RohanAutomationEngine payload.
 * Returns null when the event is not actionable.
 */
function buildAutomationPayload(event: any): {
    tenant_id: number;
    lead_id: string;
    action: string;
    persona_id?: string;
    escalation_type?: string;
    trigger_reason?: string;
    notes?: string;
    objection?: any;
} | null {
    const action = event.action;
    if (!action || !AUTOMATABLE_ACTIONS.has(action)) return null;

    const tenantId = Number(event.tenant_id);
    if (!Number.isFinite(tenantId)) return null;

    const leadId = event.lead_id ? String(event.lead_id) : '';
    if (!leadId) {
        logger.warn(`[NehaEventRoutes] reasoning_complete action "${action}" has no lead_id; skipping automation`);
        return null;
    }

    return {
        tenant_id: tenantId,
        lead_id: leadId,
        action,
        persona_id: event.persona_id,
        escalation_type: event.escalation_type || (action === 'escalate_to_human' ? event.intent : undefined),
        trigger_reason: event.trigger_reason || event.next_goal || (event.missing_info ? `Missing info: ${event.missing_info.join(', ')}` : undefined),
        notes: event.reasoning_summary || `Auto-triggered by ${event.type} event`,
        objection: event.objection,
    };
}

// ── In-memory ring buffer for recent events (for late-joining clients) ──
// Keeps the last 200 events per tenant so a dashboard that connects
// mid-call can show recent activity immediately.
interface BufferedEvent {
    type: string;
    tenant_id: string | number;
    payload: any;
    received_at: number;
}

const eventBuffer: Map<string, BufferedEvent[]> = new Map();
const BUFFER_MAX = 200;

function bufferEvent(tenantId: string | number, type: string, payload: any): void {
    const key = String(tenantId);
    const arr = eventBuffer.get(key) || [];
    arr.push({ type, tenant_id: tenantId, payload, received_at: Date.now() });
    if (arr.length > BUFFER_MAX) arr.shift();
    eventBuffer.set(key, arr);
}

export function getBufferedEvents(tenantId: string | number): BufferedEvent[] {
    return eventBuffer.get(String(tenantId)) || [];
}

// ── Auth helper ────────────────────────────────────────────────────
function validateServiceAuth(req: any): boolean {
    const authHeader = req.headers.authorization;
    const secret = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.body?.secret;
    const expectedSecret = process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me';
    return secret === expectedSecret;
}

// ── POST / — Receive a Neha lifecycle event and broadcast via Socket.IO ──
router.post('/', async (req: any, res: Response) => {
    if (!validateServiceAuth(req)) {
        return res.status(401).json({ error: 'Unauthorized internal service request' });
    }

    const event = req.body;
    if (!event || !event.type || event.tenant_id === undefined) {
        return res.status(400).json({ error: 'Missing required fields: type, tenant_id' });
    }

    const tenantId = event.tenant_id;
    const room = `tenant_${tenantId}`;

    // 1. Buffer the event for late-joining dashboard clients
    bufferEvent(tenantId, event.type, event);

    // 2. Fan out via Socket.IO to all dashboard clients in the tenant room
    if (req.io) {
        req.io.to(room).emit('neha:event', event);
        // Also emit a typed channel for specific event types (lets the
        // dashboard subscribe to only filings or only handoffs if desired).
        req.io.to(room).emit(`neha:event:${event.type}`, event);
    } else {
        logger.warn('[NehaEventRoutes] req.io not available — Socket.IO not attached');
    }

    // 3. Event-driven CRM automation: when a reasoning_complete event
    //    (either `neha:reasoning_complete` or `employee:reasoning_complete`)
    //    carries an actionable Track B `action`, forward it to the
    //    RohanAutomationEngine so the CRM workflow fires automatically —
    //    no manual dashboard trigger required. Fire-and-forget so the
    //    HTTP ack is never delayed by the automation side-effects.
    const isReasoningComplete =
        event.type === 'reasoning_complete' ||
        event.type === 'neha:reasoning_complete' ||
        event.type === 'employee:reasoning_complete';

    if (isReasoningComplete) {
        const automationPayload = buildAutomationPayload(event);
        if (automationPayload) {
            // Pass req.io through so escalate_to_human can emit a real-time
            // alert to the tenant room in addition to persisting the row.
            rohanAutomationEngine
                .executeTrigger({ ...automationPayload, io: req.io })
                .then((result) => {
                    if (result.success) {
                        logger.info(`[NehaEventRoutes] Auto-fired automation "${automationPayload.action}" for lead ${automationPayload.lead_id}: ${result.message}`);
                    } else {
                        logger.warn(`[NehaEventRoutes] Automation "${automationPayload.action}" for lead ${automationPayload.lead_id} did not complete: ${result.message}`);
                    }
                })
                .catch((err: any) => {
                    logger.error(`[NehaEventRoutes] Automation dispatch threw for "${automationPayload.action}" lead ${automationPayload.lead_id}: ${err.message}`);
                });
        }
    }

    // 4. Acknowledge
    res.status(200).json({ ok: true, type: event.type, broadcast: !!req.io });
});

import { authenticateToken } from '../../../middleware/auth';

// ── GET /buffer — Retrieve buffered events (for late-joining clients) ──
// This is authenticated with user JWT (dashboard clients call it).
router.get('/buffer', authenticateToken, async (req: any, res: Response) => {
    const tenantId = req.tenantId || req.user?.tenantId || req.user?.tenant_id || req.query.tenant_id;
    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant_id' });
    }
    const events = getBufferedEvents(tenantId);
    res.json({ events, count: events.length });
});

export default router;
