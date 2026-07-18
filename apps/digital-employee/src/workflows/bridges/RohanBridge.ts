/**
 * RohanBridge — HTTP endpoints exposing Rohan's persona + memory to the
 * CRM API (apps/api) services: AiScreener, NurtureAutoPilot, telephony.
 *
 * These endpoints run on the digital-employee's health HTTP server
 * (port VOICE_HEALTH_PORT, default 5061) so the CRM API can request
 * persona-driven, memory-aware message generation and post-call
 * logging without coupling to the voice WebSocket path.
 *
 * All endpoints are POST + JSON. They degrade gracefully: if the persona
 * or memory layer is unavailable, they return HTTP 503 with a JSON body
 * so the caller (RohanBridge client) can fall back to its generic path.
 *
 * Endpoints:
 *   POST /rohan/handshake  — persona-driven first outreach message
 *   POST /rohan/followup   — memory-aware nurture follow-up message
 *   POST /rohan/recall     — semantic recall of past turns for a lead
 *   POST /rohan/log-call   — persist a completed call turn to memory + pgvector
 *   GET  /rohan/health     — memory tier health (extends /health)
 */

import http from 'http';
import { logger } from '@zentrix/logger';
import rohanPersonaEngine from '../../employees/Rohan/Persona';
import rohanMemory from '../../memory/MemoryService';
import rohanCognitiveLoop from '../../agent/RohanAgent';
import { generateAIResponse } from '../../ai/AIService';
import { ChannelType } from '@zentrix/types';

// ── Request body shapes ─────────────────────────────────────────────
interface HandshakeRequest {
    tenant_id: number;
    lead_id: string;
    lead_name: string;
    source?: string;
    project_name?: string;
    channel?: ChannelType;
}

interface FollowupRequest {
    tenant_id: number;
    lead_id: string;
    lead_name: string;
    nurture_reason?: string;
    channel?: ChannelType;
}

interface RecallRequest {
    tenant_id: number;
    lead_id: string;
    query: string;
}

interface LogCallRequest {
    tenant_id: number;
    lead_id: string;
    persona_id: string;
    channel: ChannelType;
    turn_number: number;
    user_input: string;
    response_given: string;
    intent?: string;
    emotion?: string;
}

interface ChatRequest {
    tenant_id: number;
    from_phone: string;
    message_text: string;
    channel?: ChannelType;
}

// ── Response shape ──────────────────────────────────────────────────
interface BridgeResponse {
    ok: boolean;
    message?: string;
    data?: any;
    error?: string;
}

function sendJson(res: http.ServerResponse, status: number, body: BridgeResponse): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

/**
 * Mount Rohan bridge routes onto an existing http.Server. The CRM API
 * calls these over HTTP; they never touch the voice WebSocket path.
 */
export function mountRohanBridge(server: http.Server): void {
    // Augment the server's request handler. We attach a listener that
    // runs before the existing health handler by listening on 'request'.
    server.on('request', async (req, res) => {
        const url = req.url || '';
        const method = req.method || '';

        // Only handle /rohan/* routes; everything else falls through.
        if (!url.startsWith('/rohan')) return;

        // ── Authentication Guard ────────────────────────────────────
        // All /rohan/* routes (except /rohan/health) require an internal
        // API key to prevent unauthenticated AI generation by any process
        // with network access to the health port.
        const expectedSecret = process.env.ROHAN_BRIDGE_SECRET || process.env.JWT_SECRET || '';
        if (url !== '/rohan/health' && expectedSecret) {
            const providedKey = req.headers['x-internal-key'] as string || '';
            if (providedKey !== expectedSecret) {
                logger.warn(`[RohanBridge] Unauthorized request to ${url} — missing or invalid X-Internal-Key`);
                return sendJson(res, 401, { ok: false, error: 'Unauthorized — X-Internal-Key header required' });
            }
        }

        try {
            // ── GET /rohan/health ───────────────────────────────────
            if (method === 'GET' && url === '/rohan/health') {
                return sendJson(res, 200, {
                    ok: true,
                    data: rohanMemory.getHealthStatus(),
                });
            }

            // All other /rohan routes are POST with a JSON body.
            if (method !== 'POST') {
                return sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
            }

            const raw = await readBody(req);
            let body: any;
            try {
                body = JSON.parse(raw || '{}');
            } catch {
                return sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
            }

            // ── POST /rohan/handshake ─────────────────────────────
            if (url === '/rohan/handshake') {
                return await handleHandshake(req, res, body as HandshakeRequest);
            }

            // ── POST /rohan/followup ──────────────────────────────
            if (url === '/rohan/followup') {
                return await handleFollowup(req, res, body as FollowupRequest);
            }

            // ── POST /rohan/recall ────────────────────────────────
            if (url === '/rohan/recall') {
                return await handleRecall(req, res, body as RecallRequest);
            }

            // ── POST /rohan/log-call ──────────────────────────────
            if (url === '/rohan/log-call') {
                return await handleLogCall(req, res, body as LogCallRequest);
            }

            // ── POST /rohan/chat ──────────────────────────────────
            if (url === '/rohan/chat') {
                return await handleChat(req, res, body as ChatRequest);
            }

            return sendJson(res, 404, { ok: false, error: 'Unknown /rohan route' });
        } catch (err: any) {
            logger.error(`[RohanBridge] Unhandled error: ${err.message}`);
            return sendJson(res, 500, { ok: false, error: 'Internal bridge error' });
        }
    });

    logger.info('[RohanBridge] HTTP bridge routes mounted on /rohan/*');
}

// ── Handlers ────────────────────────────────────────────────────────

async function handleHandshake(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    body: HandshakeRequest
): Promise<void> {
    const { tenant_id, lead_id, lead_name, source, project_name, channel = 'whatsapp' } = body;

    if (!tenant_id || !lead_id || !lead_name) {
        return sendJson(res, 400, { ok: false, error: 'tenant_id, lead_id, lead_name are required' });
    }

    try {
        // 1. Load Rohan's persona for this tenant.
        const persona = await rohanPersonaEngine.getPersona(tenant_id);

        // 2. Load memory context so the handshake is aware of any prior touch.
        const context = await rohanMemory.loadContext(
            tenant_id, persona, lead_id, channel, `New lead from ${source || 'unknown'}`
        );

        // 3. Build a persona-driven handshake prompt.
        const systemPrompt = rohanPersonaEngine.buildSystemPrompt(persona, context, 'fast');
        const prompt = `${systemPrompt}

You are reaching out to a brand-new lead for the FIRST time via WhatsApp.
Lead Name: ${lead_name}
Source: ${source || 'organic'}
Project Interest: ${project_name || 'general'}

Write a warm, professional 2-sentence WhatsApp greeting in Rohan's voice that:
1. Welcomes them by name.
2. Asks ONE low-friction qualifying question (investment vs self-use, or budget range).

Keep it under 160 characters. No placeholders. No emojis overload.`;

        const message = await generateAIResponse(prompt, false);

        // 4. Persist this outreach turn to memory + pgvector (write-through).
        await rohanMemory.saveConversationState(tenant_id, lead_id, {
            ...context.conversation_state,
            turn_count: context.conversation_state.turn_count + 1,
            last_rohan_message: message,
            next_action: 'await_lead_reply',
        });

        return sendJson(res, 200, { ok: true, data: { message, persona: persona.employee_name } });
    } catch (err: any) {
        logger.warn(`[RohanBridge] handshake failed: ${err.message}`);
        return sendJson(res, 503, { ok: false, error: 'Rohan handshake unavailable', message: err.message });
    }
}

async function handleFollowup(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    body: FollowupRequest
): Promise<void> {
    const { tenant_id, lead_id, lead_name, nurture_reason, channel = 'whatsapp' } = body;

    if (!tenant_id || !lead_id || !lead_name) {
        return sendJson(res, 400, { ok: false, error: 'tenant_id, lead_id, lead_name are required' });
    }

    try {
        const persona = await rohanPersonaEngine.getPersona(tenant_id);

        // Load full context — this pulls recent interactions + semantic recall
        // so the follow-up references what was last discussed.
        const context = await rohanMemory.loadContext(
            tenant_id, persona, lead_id, channel, nurture_reason || 'follow-up check-in'
        );

        const lastInteraction = context.recent_interactions[0];
        const semanticHints = (context.semantic_memories || [])
            .slice(0, 2)
            .map(m => m.content)
            .join(' | ');

        const systemPrompt = rohanPersonaEngine.buildSystemPrompt(persona, context, 'fast');
        const prompt = `${systemPrompt}

You are sending a nurture follow-up WhatsApp message to ${lead_name}.
Reason for follow-up: ${nurture_reason || 'Periodic check-in'}
Last interaction: ${lastInteraction ? `${lastInteraction.type} — ${lastInteraction.note}` : 'none'}
Recalled context: ${semanticHints || 'none'}

Write a single concise WhatsApp message (under 200 characters) in Rohan's voice that:
1. References the last touchpoint naturally (don't sound robotic).
2. Offers a concrete next step (site visit, new inventory, price update).

No placeholders. Conversational, warm.`;

        const message = await generateAIResponse(prompt, false);

        await rohanMemory.saveConversationState(tenant_id, lead_id, {
            ...context.conversation_state,
            turn_count: context.conversation_state.turn_count + 1,
            last_rohan_message: message,
            next_action: 'await_lead_reply',
        });

        return sendJson(res, 200, { ok: true, data: { message, persona: persona.employee_name } });
    } catch (err: any) {
        logger.warn(`[RohanBridge] followup failed: ${err.message}`);
        return sendJson(res, 503, { ok: false, error: 'Rohan followup unavailable', message: err.message });
    }
}

async function handleRecall(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    body: RecallRequest
): Promise<void> {
    const { tenant_id, lead_id, query } = body;

    if (!tenant_id || !lead_id || !query) {
        return sendJson(res, 400, { ok: false, error: 'tenant_id, lead_id, query are required' });
    }

    try {
        // Use a throwaway persona fetch just to satisfy loadContext signature;
        // the recall itself is memory-driven.
        const persona = await rohanPersonaEngine.getPersona(tenant_id);
        const context = await rohanMemory.loadContext(tenant_id, persona, lead_id, 'whatsapp', query);

        return sendJson(res, 200, {
            ok: true,
            data: {
                semantic_memories: context.semantic_memories || [],
                recent_interactions: context.recent_interactions,
                conversation_state: context.conversation_state,
            },
        });
    } catch (err: any) {
        logger.warn(`[RohanBridge] recall failed: ${err.message}`);
        return sendJson(res, 503, { ok: false, error: 'Rohan recall unavailable', message: err.message });
    }
}

async function handleLogCall(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    body: LogCallRequest
): Promise<void> {
    const { tenant_id, lead_id, persona_id, channel, turn_number, user_input, response_given, intent, emotion } = body;

    if (!tenant_id || !lead_id || !persona_id || !user_input || !response_given) {
        return sendJson(res, 400, { ok: false, error: 'tenant_id, lead_id, persona_id, user_input, response_given are required' });
    }

    try {
        // Ensure a memory record exists for this lead.
        const memory = await rohanMemory.getOrCreateMemory(tenant_id, persona_id, lead_id, channel || 'voice');

        // Log the reasoning turn (this also write-throughs to pgvector).
        await rohanMemory.logReasoning(
            tenant_id,
            persona_id,
            lead_id,
            memory.id,
            turn_number || 1,
            channel || 'voice',
            user_input,
            {
                intent: intent || 'call_completed',
                emotion: (emotion as any) || 'neutral',
                emotion_score: 0,
                stage: 'evaluation',
                missing_info: [],
                action: 'respond',
                response: response_given,
                crm_update: {},
                next_goal: 'follow_up',
            } as any,
            response_given,
            0, // latency — caller may not have it
            0
        );

        return sendJson(res, 200, { ok: true, data: { memory_id: memory.id, logged: true } });
    } catch (err: any) {
        logger.warn(`[RohanBridge] log-call failed: ${err.message}`);
        return sendJson(res, 503, { ok: false, error: 'Rohan log-call unavailable', message: err.message });
    }
}

/**
 * POST /rohan/chat — persona-driven WhatsApp chat response.
 *
 * Unlike /rohan/followup (which takes a lead_id), this endpoint resolves
 * the lead from a phone number — the chatbot receives inbound WhatsApp
 * messages keyed by phone, not by lead_id. If no lead is found, we still
 * generate a persona-driven response using a throwaway lead_id so the
 * conversation is warm even for unknown numbers.
 */
async function handleChat(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    body: ChatRequest
): Promise<void> {
    const { tenant_id, from_phone, message_text, channel = 'whatsapp' } = body;

    if (!tenant_id || !from_phone || !message_text) {
        return sendJson(res, 400, { ok: false, error: 'tenant_id, from_phone, message_text are required' });
    }

    try {
        // 1. Resolve the lead from the phone number.
        let leadId = `phone_${from_phone.replace(/\D/g, '')}`;
        let leadName = 'there';
        let projectName: string | undefined;

        try {
            const { Pool } = await import('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const { rows } = await pool.query(
                `SELECT l.id, l.name, p.name as project_name
                 FROM leads l LEFT JOIN projects p ON l.project_id = p.id
                 WHERE l.tenant_id = $1 AND l.phone = $2
                 ORDER BY l.created_at DESC LIMIT 1`,
                [tenant_id, from_phone]
            );
            if (rows[0]) {
                leadId = String(rows[0].id);
                leadName = rows[0].name;
                projectName = rows[0].project_name;
            }
            await pool.end();
        } catch {
            // DB lookup failed — proceed with throwaway lead_id.
        }

        // 2. Load persona.
        const persona = await rohanPersonaEngine.getPersona(tenant_id);

        // 3. Process the chat message through the unified Two-Track Cognitive Loop
        const result = await rohanCognitiveLoop.processCycle({
            tenant_id,
            persona_id: persona.id,
            lead_id: leadId,
            channel: 'whatsapp',
            user_message: message_text,
            detected_language: 'hinglish'
        });

        const message = result.fast_response.text;

        return sendJson(res, 200, {
            ok: true,
            data: {
                message,
                persona: persona.employee_name,
                lead_id: leadId,
                lead_name: leadName,
            },
        });
    } catch (err: any) {
        logger.warn(`[RohanBridge] chat failed: ${err.message}`);
        return sendJson(res, 503, { ok: false, error: 'Rohan chat unavailable', message: err.message });
    }
}
