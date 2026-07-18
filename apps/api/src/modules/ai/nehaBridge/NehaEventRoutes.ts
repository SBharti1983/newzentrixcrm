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

const router = express.Router();

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

    // 3. Acknowledge
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
