/**
 * Rohan Digital Employee — Dedicated Voice WebSocket Server
 *
 * This is the entrypoint for the isolated voice process.
 * It runs on its own Node.js event loop, completely separate from
 * the CRM Express API (apps/api), ensuring zero latency contention.
 */

import './env';
import { logger } from '@zentrix/logger';
import rohanMemory from './memory/MemoryService';
import { startWsServer } from './transport/WsServer';
import { startHealthServer } from './transport/HealthServer';
import { FollowUpWorker } from './workers/FollowUpWorker';
import { CRMSyncWorker } from './workers/CRMSyncWorker';
import { ReminderWorker } from './workers/ReminderWorker';
import { AnalyticsWorker } from './workers/AnalyticsWorker';

// Initialize background event workers
FollowUpWorker.init();
CRMSyncWorker.init();
ReminderWorker.init();
AnalyticsWorker.init();


// ── Configuration ──────────────────────────────────────────────────
const PORT = parseInt(process.env.VOICE_WS_PORT || '5060', 10);
const HOST = process.env.VOICE_WS_HOST || '0.0.0.0';
const HEALTH_PORT = parseInt(process.env.VOICE_HEALTH_PORT || '5061', 10);

logger.info(`📡  Process PID: ${process.pid} (isolated from CRM API)`);

// Start transport servers
const wss = startWsServer(PORT, HOST);
const healthServer = startHealthServer(HEALTH_PORT, HOST);

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
