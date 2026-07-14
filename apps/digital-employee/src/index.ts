/**
 * Rohan Digital Employee — Dedicated Voice WebSocket Server
 *
 * This is the entrypoint for the isolated voice process.
 * It runs on its own Node.js event loop, completely separate from
 * the CRM Express API (apps/api), ensuring zero latency contention.
 *
 * Architecture:
 *   - WebSocket server on port 5060 (configurable)
 *   - Accepts audio streams from Python ZenVoice dialer or FreeSWITCH
 *   - Routes transcriptions through Rohan's CognitiveLoop
 *   - Streams TTS audio back to the caller
 *
 * Scaling:
 *   - This process can be horizontally scaled independently
 *   - Multiple instances behind a WebSocket load balancer
 *   - Each instance handles ~100 concurrent voice sessions
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '@zentrix/logger';
import crypto from 'crypto';
import voiceAdapter from './voice/VoiceAdapter';
import rohanMemory from './services/RohanMemory';

function generateId(): string {
    return crypto.randomUUID();
}

// ── Configuration ──────────────────────────────────────────────────
const PORT = parseInt(process.env.VOICE_WS_PORT || '5060', 10);
const HOST = process.env.VOICE_WS_HOST || '0.0.0.0';

// ── WebSocket Server ───────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT, host: HOST });

logger.info(`🎙️  Rohan Voice Server starting on ws://${HOST}:${PORT}`);
logger.info(`📡  Process PID: ${process.pid} (isolated from CRM API)`);

wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url || '/', `ws://${req.headers.host}`);
    const params = url.searchParams;

    // Extract session metadata from query params or headers
    const sessionId = params.get('session_id') || generateId();
    const tenantId = parseInt(params.get('tenant_id') || '0', 10);
    const personaId = params.get('persona_id') || 'default';
    const leadId = params.get('lead_id') || undefined;
    const language = (params.get('language') || 'hinglish') as any;

    if (!tenantId) {
        logger.warn(`[VoiceServer] Connection rejected — missing tenant_id`);
        ws.close(4001, 'tenant_id is required');
        return;
    }

    logger.info(`[VoiceServer] New connection: session=${sessionId}, tenant=${tenantId}, lead=${leadId || 'none'}`);

    // Delegate to VoiceAdapter
    await voiceAdapter.handleConnection(ws, {
        sessionId,
        tenantId,
        personaId,
        leadId,
        language,
    });
});

wss.on('error', (err) => {
    logger.error(`[VoiceServer] Server error: ${err.message}`);
});

// ── Health Check (lightweight HTTP endpoint) ───────────────────────
import http from 'http';

const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        const memoryHealth = rohanMemory.getHealthStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'digital-employee-voice',
            pid: process.pid,
            uptime_seconds: Math.floor(process.uptime()),
            active_sessions: voiceAdapter.getActiveSessionCount(),
            memory: memoryHealth,
            timestamp: new Date().toISOString(),
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const HEALTH_PORT = parseInt(process.env.VOICE_HEALTH_PORT || '5061', 10);
healthServer.listen(HEALTH_PORT, () => {
    logger.info(`💚  Health check available at http://${HOST}:${HEALTH_PORT}/health`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
    logger.info(`[VoiceServer] Received ${signal} — shutting down gracefully`);

    // Close WebSocket server (stop accepting new connections)
    wss.close(() => {
        logger.info('[VoiceServer] WebSocket server closed');
    });

    // Close health check server
    healthServer.close();

    // Shutdown memory layer (Redis disconnect)
    await rohanMemory.shutdown();

    logger.info('[VoiceServer] Shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info(`✅  Rohan Voice Server ready — listening for voice connections`);
