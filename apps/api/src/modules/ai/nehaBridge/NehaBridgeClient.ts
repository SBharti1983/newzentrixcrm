/**
 * NehaBridgeClient — HTTP client that calls the digital-employee's
 * /neha/* bridge endpoints to obtain persona-driven, memory-aware
 * responses from Neha (AI accountant).
 *
 * Design principles (mirrors RohanBridgeClient):
 *  - **Graceful fallback**: every method returns `null` on any failure
 *    (network error, 503, timeout, non-OK body). Callers MUST handle
 *    `null` by falling back to their existing generic AI path. This
 *    means the CRM keeps working even if the voice service is down,
 *    restarting, or the persona/memory layer is degraded.
 *  - **Short timeout**: 8s default. The CRM API should never block
 *    long on the voice service; if Neha is slow we degrade fast.
 *  - **No throwing**: the client logs warnings but never throws, so
 *    callers don't need try/catch around bridge calls.
 *  - **Singleton**: one axios instance reused across all CRM services.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@zentrix/logger';

// ── Configuration ───────────────────────────────────────────────────
const NEHA_BRIDGE_URL =
    process.env.NEHA_BRIDGE_URL || process.env.ROHAN_BRIDGE_URL || 'http://localhost:5061';
const NEHA_BRIDGE_TIMEOUT_MS = Number(process.env.NEHA_BRIDGE_TIMEOUT_MS) || 8000;

// ── Public request / response shapes ────────────────────────────────

export interface NehaChatParams {
    tenant_id: number;
    from_phone: string;
    message_text: string;
    channel?: string;
    caller_name?: string;
}

export interface NehaRecallParams {
    tenant_id: number;
    lead_id: string;
    query: string;
}

export interface NehaLogCallParams {
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

export interface NehaFilingStatusParams {
    tenant_id: number;
    customer_id?: string;
    lead_id?: string;
}

export interface NehaDuesParams {
    tenant_id: number;
    customer_id?: string;
    lead_id?: string;
}

export interface NehaChatResult {
    message: string;
    persona: string;
    lead_id: string;
    lead_name: string;
}

export interface NehaRecallResult {
    semantic_memories: any[];
    recent_interactions: any[];
    conversation_state: any;
}

export interface NehaLogCallResult {
    memory_id: string;
    logged: boolean;
}

export interface NehaFilingStatusResult {
    filings: Array<{
        id: string;
        filing_type: string;
        gst_return_type?: string;
        period: string;
        status: string;
        created_at: string;
    }>;
}

export interface NehaDuesResult {
    dues: Array<{
        id: string;
        description: string;
        amount: number;
        due_date?: string;
        status: string;
    }>;
}

// ── Client ──────────────────────────────────────────────────────────
class NehaBridgeClient {
    private http: AxiosInstance;
    private available: boolean = true;
    private lastFailureAt: number = 0;
    private readonly cooldownMs: number = 30_000; // back off after failure

    constructor() {
        this.http = axios.create({
            baseURL: NEHA_BRIDGE_URL,
            timeout: NEHA_BRIDGE_TIMEOUT_MS,
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
            logger.warn(`[NehaBridgeClient] ${path} returned non-ok: ${JSON.stringify(res.data)}`);
            this.markUnavailable();
            return null;
        } catch (err) {
            const axiosErr = err as AxiosError;
            const status = axiosErr.response?.status;
            const msg = axiosErr.message;
            if (!status || status >= 500 || status === 503) {
                logger.warn(`[NehaBridgeClient] ${path} failed (status=${status || 'network'}): ${msg}`);
                this.markUnavailable();
            } else {
                logger.warn(`[NehaBridgeClient] ${path} client error (status=${status}): ${msg}`);
            }
            return null;
        }
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Request a persona-driven chat reply from Neha (e.g. for WhatsApp
     * or web chat about GST/ITR/accounts). Returns null if Neha is
     * unavailable — caller should fall back to the generic AI path.
     */
    async chat(params: NehaChatParams): Promise<NehaChatResult | null> {
        return this.post<NehaChatResult>('/neha/chat', params as any);
    }

    /**
     * Semantic recall of past conversation turns for a lead/customer.
     * Returns null if Neha is unavailable.
     */
    async recall(params: NehaRecallParams): Promise<NehaRecallResult | null> {
        return this.post<NehaRecallResult>('/neha/recall', params as any);
    }

    /**
     * Persist a completed call turn to Neha's memory + pgvector.
     * Fire-and-forget semantics: returns null on failure.
     */
    async logCall(params: NehaLogCallParams): Promise<NehaLogCallResult | null> {
        return this.post<NehaLogCallResult>('/neha/log-call', params as any);
    }

    /**
     * Look up recent filing tasks (GST/ITR) for a customer/lead.
     * Returns null if Neha is unavailable.
     */
    async filingStatus(params: NehaFilingStatusParams): Promise<NehaFilingStatusResult | null> {
        return this.post<NehaFilingStatusResult>('/neha/filing-status', params as any);
    }

    /**
     * Look up outstanding dues / payment schedule for a customer/lead.
     * Returns null if Neha is unavailable.
     */
    async dues(params: NehaDuesParams): Promise<NehaDuesResult | null> {
        return this.post<NehaDuesResult>('/neha/dues', params as any);
    }

    /**
     * Lightweight health probe. Returns true if the bridge responds.
     */
    async isHealthy(): Promise<boolean> {
        if (!this.shouldAttempt()) return false;
        try {
            const res = await this.http.get('/neha/health', { timeout: 3000 });
            return res.data && res.data.ok === true;
        } catch {
            this.markUnavailable();
            return false;
        }
    }
}

// Singleton — shared across all CRM services.
const nehaBridgeClient = new NehaBridgeClient();
export default nehaBridgeClient;
