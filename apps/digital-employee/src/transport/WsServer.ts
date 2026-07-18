import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '@zentrix/logger';
import crypto from 'crypto';
import voiceAdapter from '../voice/RohanVoiceAdapter';
import monikaVoiceAdapter from '../voice/MonikaVoiceAdapter';
import nehaVoiceAdapter from '../voice/NehaVoiceAdapter';
import type { BaseVoiceAdapter } from '../voice/BaseVoiceAdapter';

function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Map a role string to the corresponding voice adapter singleton.
 * Defaults to Rohan (sales) for backward compatibility.
 */
function resolveAdapter(role: string | null): BaseVoiceAdapter {
    switch (role) {
        case 'monika':
            return monikaVoiceAdapter;
        case 'neha':
            return nehaVoiceAdapter;
        case 'rohan':
        default:
            return voiceAdapter;
    }
}

export function startWsServer(port: number, host: string): WebSocketServer {
    const wss = new WebSocketServer({ port, host });

    logger.info(`🎙️  Zentrix Voice Server starting on ws://${host}:${port}`);

    wss.on('connection', async (ws: WebSocket, req) => {
        try {
            const url = new URL(req.url || '/', 'http://localhost');
            const params = url.searchParams;

            // Extract session metadata from query params or headers
            const sessionId = params.get('session_id') || generateId();
            const tenantId: any = params.get('tenant_id') || '0';
            const personaId = params.get('persona_id') || 'default';
            const leadId = params.get('lead_id') || undefined;
            const language = (params.get('language') || 'hinglish') as any;
            const role = params.get('role') || 'rohan';
            const callerName = params.get('caller_name') || undefined;
            const callerPhone = params.get('caller_phone') || undefined;

            if (!tenantId) {
                logger.warn(`[VoiceServer] Connection rejected — missing tenant_id`);
                ws.close(4001, 'tenant_id is required');
                return;
            }

            logger.info(
                `[VoiceServer] New connection: session=${sessionId}, tenant=${tenantId}, role=${role}, lead=${leadId || 'none'}`
            );

            // Delegate to the role-specific VoiceAdapter
            const adapter = resolveAdapter(role);
            await adapter.handleConnection(ws, {
                sessionId,
                tenantId,
                personaId,
                leadId,
                language,
                callerName,
                callerPhone,
            });
        } catch (err: any) {
            logger.error(`[VoiceServer] Error handling connection: ${err.message}`, err);
            ws.close(1011, 'Internal server error');
        }
    });

    wss.on('error', (err) => {
        logger.error(`[VoiceServer] Server error: ${err.message}`);
    });

    return wss;
}
