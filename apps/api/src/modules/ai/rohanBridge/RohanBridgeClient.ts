/**
 * RohanBridgeClient — HTTP client that calls the digital-employee's
 * /rohan/* bridge endpoints to obtain persona-driven, memory-aware
 * messages from Rohan.
 *
 * Design principles:
 *  - **Graceful fallback**: every method returns `null` on any failure
 *    (network error, 503, timeout, non-OK body). Callers MUST handle
 *    `null` by falling back to their existing generic AI path. This
 *    means the CRM keeps working even if the voice service is down,
 *    restarting, or the persona/memory layer is degraded.
 *  - **Short timeout**: 8s default. The CRM API should never block
 *    long on the voice service; if Rohan is slow we degrade fast.
 *  - **No throwing**: the client logs warnings but never throws, so
 *    callers don't need try/catch around bridge calls.
 *  - **Singleton**: one axios instance reused across all CRM services.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@zentrix/logger';

// ── Configuration ───────────────────────────────────────────────────
const ROHAN_BRIDGE_URL =
    process.env.ROHAN_BRIDGE_URL || 'http://localhost:5061';
const ROHAN_BRIDGE_TIMEOUT_MS = Number(process.env.ROHAN_BRIDGE_TIMEOUT_MS) || 8000;

// ── Public request / response shapes ────────────────────────────────
export interface HandshakeParams {
    tenant_id: number;
    lead_id: string;
    lead_name: string;
    source?: string;
    project_name?: string;
    channel?: string;
}

export interface FollowupParams {
    tenant_id: number;
    lead_id: string;
    lead_name: string;
    nurture_reason?: string;
    channel?: string;
}

export interface RecallParams {
    tenant_id: number;
    lead_id: string;
    query: string;
}

export interface LogCallParams {
    tenant_id: number;
    lead_id: string;
    persona_id: string;
    channel: string;
    turn_number: number;
    user_input: string;
    response_given: string;
    intent?: string;
    emotion?: string;
}

export interface ChatParams {
    tenant_id: number;
    from_phone: string;
    message_text: string;
    channel?: string;
}

export interface HandshakeResult {
    message: string;
    persona: string;
}

export interface FollowupResult {
    message: string;
    persona: string;
}

export interface RecallResult {
    semantic_memories: any[];
    recent_interactions: any[];
    conversation_state: any;
}

export interface LogCallResult {
    memory_id: string;
    logged: boolean;
}

export interface ChatResult {
    message: string;
    persona: string;
    lead_id: string;
    lead_name: string;
}

// ── Client ──────────────────────────────────────────────────────────
class RohanBridgeClient {
    private http: AxiosInstance;
    private available: boolean = true;
    private lastFailureAt: number = 0;
    private readonly cooldownMs: number = 30_000; // back off after failure

    constructor() {
        this.http = axios.create({
            baseURL: ROHAN_BRIDGE_URL,
            timeout: ROHAN_BRIDGE_TIMEOUT_MS,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /**
     * Quick availability gate. After a failure we enter a cooldown
     * period during which all calls short-circuit to null without
     * hitting the network — this prevents thundering-herd retries
     * when the voice service is down.
     */
    private shouldAttempt(): boolean {
        if (this.available) return true;
        const elapsed = Date.now() - this.lastFailureAt;
        if (elapsed >= this.cooldownMs) {
            // Cooldown elapsed — try again.
            this.available = true;
            return true;
        }
        return false;
    }

    private markUnavailable(): void {
        this.available = false;
        this.lastFailureAt = Date.now();
    }

    /**
     * Generic POST wrapper that handles all failure modes uniformly.
     * Returns the `data` field on success, or `null` on any failure.
     */
    private async post<T>(
        path: string,
        body: Record<string, unknown>
    ): Promise<T | null> {
        if (!this.shouldAttempt()) return null;

        try {
            const res = await this.http.post(path, body);
            if (res.data && res.data.ok === true && res.data.data) {
                return res.data.data as T;
            }
            // Bridge returned a structured non-OK response (e.g. 503).
            logger.warn(`[RohanBridgeClient] ${path} returned non-ok: ${JSON.stringify(res.data)}`);
            this.markUnavailable();
            return null;
        } catch (err) {
            const axiosErr = err as AxiosError;
            const status = axiosErr.response?.status;
            const msg = axiosErr.message;
            // 503 = voice service intentionally degraded; 5xx = server error;
            // network errors = service down. All are recoverable → cooldown.
            if (!status || status >= 500 || status === 503) {
                logger.warn(`[RohanBridgeClient] ${path} failed (status=${status || 'network'}): ${msg}`);
                this.markUnavailable();
            } else {
                logger.warn(`[RohanBridgeClient] ${path} client error (status=${status}): ${msg}`);
            }
            return null;
        }
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Request a persona-driven first-outreach handshake message.
     * Returns null if Rohan is unavailable — caller should fall back
     * to the generic generateAIResponse path.
     */
    async handshake(params: HandshakeParams): Promise<HandshakeResult | null> {
        return this.post<HandshakeResult>('/rohan/handshake', params as any);
    }

    /**
     * Request a memory-aware nurture follow-up message.
     * Returns null if Rohan is unavailable.
     */
    async followup(params: FollowupParams): Promise<FollowupResult | null> {
        return this.post<FollowupResult>('/rohan/followup', params as any);
    }

    /**
     * Semantic recall of past conversation turns for a lead.
     * Returns null if Rohan is unavailable.
     */
    async recall(params: RecallParams): Promise<RecallResult | null> {
        return this.post<RecallResult>('/rohan/recall', params as any);
    }

    /**
     * Persist a completed call turn to Rohan's memory + pgvector.
     * Fire-and-forget semantics: returns null on failure but the
     * caller typically doesn't need the result.
     */
    async logCall(params: LogCallParams): Promise<LogCallResult | null> {
        return this.post<LogCallResult>('/rohan/log-call', params as any);
    }

    /**
     * Request a persona-driven chat reply (e.g. for WhatsApp).
     * Returns null if Rohan is unavailable.
     */
    async chat(params: ChatParams): Promise<ChatResult | null> {
        return this.post<ChatResult>('/rohan/chat', params as any);
    }

    /**
     * Lightweight health probe. Returns true if the bridge responds.
     */
    async isHealthy(): Promise<boolean> {
        if (!this.shouldAttempt()) return false;
        try {
            const res = await this.http.get('/rohan/health', { timeout: 3000 });
            return res.data && res.data.ok === true;
        } catch {
            this.markUnavailable();
            return false;
        }
    }
}

// Singleton — shared across all CRM services.
const rohanBridgeClient = new RohanBridgeClient();
export default rohanBridgeClient;
