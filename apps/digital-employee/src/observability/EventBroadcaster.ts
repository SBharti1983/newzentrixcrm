/**
 * EventBroadcaster — Lightweight real-time event emitter for the AI
 * Digital Employee platform.
 *
 * Lives inside the digital-employee process and POSTs lifecycle events
 * from the cognitive loops to the CRM API's events endpoint
 * (POST /api/v1/neha/events — also receives employee:* events). The CRM
 * API then fans them out via Socket.IO to all connected dashboard clients
 * in the tenant room.
 *
 * Originally Neha-only (neha:* events). Item 1.5 generalizes it to emit
 * employee:* events for all three employees (Rohan, Monika, Neha) from
 * BaseCognitiveLoop. Neha keeps its neha:* events via its own override.
 *
 * Design principles:
 *  - **Fire-and-forget**: never blocks the cognitive loop. Every emit
 *    is wrapped in a detached promise with a short timeout; failures
 *    are logged once and swallowed.
 *  - **No throwing**: the broadcaster must never break call handling.
 *    If the CRM API is down, events are simply dropped.
 *  - **Configurable endpoint**: reads NEHA_EVENTS_URL (or falls back to
 *    CRM_API_URL + /api/v1/neha/events). Can be disabled entirely with
 *    NEHA_EVENTS_DISABLED=1 (useful for replays/tests).
 *  - **Singleton**: one axios instance reused across all turns.
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '@zentrix/logger';

// ── Configuration ───────────────────────────────────────────────────
const CRM_API_URL =
    process.env.CRM_API_URL || process.env.API_URL || 'http://localhost:3000';
const EVENTS_ENDPOINT =
    process.env.NEHA_EVENTS_URL || `${CRM_API_URL}/api/v1/neha/events`;
const EVENTS_TIMEOUT_MS = Number(process.env.NEHA_EVENTS_TIMEOUT_MS) || 3000;
const EVENTS_DISABLED =
    process.env.NEHA_EVENTS_DISABLED === '1' ||
    process.env.NEHA_EVENTS_DISABLED === 'true';

// ── Event Types ────────────────────────────────────────────────────

export type NehaEventType =
    | 'neha:turn_started'
    | 'neha:track_a_response'
    | 'neha:reasoning_complete'
    | 'neha:filing_created'
    | 'neha:filing_progress'
    | 'neha:handoff'
    | 'neha:call_started'
    | 'neha:call_ended';

// ── Generalized employee events (item 1.5) ─────────────────────────
// Emitted by BaseCognitiveLoop.emitTurnEvents() for Rohan & Monika.
// Neha keeps its neha:* events via its own override.
export type EmployeeRole = 'rohan' | 'monika' | 'neha';

export type EmployeeEventType =
    | 'employee:turn_started'
    | 'employee:track_a_response'
    | 'employee:reasoning_complete'
    | 'employee:reasoning_failed';

export interface EmployeeEventBase {
    type: EmployeeEventType;
    role: EmployeeRole;
    tenant_id: number | string;
    persona_id?: string;
    session_id?: string;
    lead_id?: string | null;
    caller_phone?: string;
    caller_name?: string;
    channel?: string;
    turn_number?: number;
    timestamp: number;
}

export interface EmployeeTurnStartedEvent extends EmployeeEventBase {
    type: 'employee:turn_started';
    user_message: string;
    detected_language?: string;
}

export interface EmployeeTrackAResponseEvent extends EmployeeEventBase {
    type: 'employee:track_a_response';
    response_text: string;
    latency_ms: number;
    language: string;
    filler_prefix?: string;
}

export interface EmployeeReasoningCompleteEvent extends EmployeeEventBase {
    type: 'employee:reasoning_complete';
    intent: string;
    action: string;
    emotion: string;
    /** null = unknown (item 4.5); a number = the model's confidence score. */
    confidence: number | null;
    reasoning_latency_ms: number;
    total_latency_ms: number;
    next_goal?: string;
    missing_info?: string[];
}

export interface EmployeeReasoningFailedEvent extends EmployeeEventBase {
    type: 'employee:reasoning_failed';
    error: string;
    used_fallback: boolean;
}

export type EmployeeEvent =
    | EmployeeTurnStartedEvent
    | EmployeeTrackAResponseEvent
    | EmployeeReasoningCompleteEvent
    | EmployeeReasoningFailedEvent;

export interface NehaEventBase {
    type: NehaEventType;
    tenant_id: number | string;
    persona_id?: string;
    session_id?: string;
    lead_id?: string | null;
    caller_phone?: string;
    caller_name?: string;
    channel?: string;
    turn_number?: number;
    timestamp: number;
}

export interface NehaTurnStartedEvent extends NehaEventBase {
    type: 'neha:turn_started';
    user_message: string;
    detected_language?: string;
}

export interface NehaTrackAResponseEvent extends NehaEventBase {
    type: 'neha:track_a_response';
    response_text: string;
    latency_ms: number;
    language: string;
    filler_prefix?: string;
}

export interface NehaReasoningCompleteEvent extends NehaEventBase {
    type: 'neha:reasoning_complete';
    intent: string;
    action: string;
    emotion: string;
    /** null = unknown (item 4.5); a number = the model's confidence score. */
    confidence: number | null;
    reasoning_latency_ms: number;
    total_latency_ms: number;
    next_goal?: string;
    missing_info?: string[];
}

export interface NehaFilingCreatedEvent extends NehaEventBase {
    type: 'neha:filing_created';
    filing_type: string;
    gst_return_type?: string;
    period?: string;
    status: string;
    required_documents: string[];
    customer_id?: string | null;
}

export interface NehaFilingProgressEvent extends NehaEventBase {
    type: 'neha:filing_progress';
    action: string;
    filing_type: string;
    gst_return_type?: string;
}

export interface NehaHandoffEvent extends NehaEventBase {
    type: 'neha:handoff';
    handoff_target: string;
    handoff_reason: string;
    handoff_message?: string;
    manager_name?: string;
}

export interface NehaCallStartedEvent extends NehaEventBase {
    type: 'neha:call_started';
}

export interface NehaCallEndedEvent extends NehaEventBase {
    type: 'neha:call_ended';
    duration_seconds?: number;
    total_turns?: number;
}

export type NehaEvent =
    | NehaTurnStartedEvent
    | NehaTrackAResponseEvent
    | NehaReasoningCompleteEvent
    | NehaFilingCreatedEvent
    | NehaFilingProgressEvent
    | NehaHandoffEvent
    | NehaCallStartedEvent
    | NehaCallEndedEvent;

// ── Broadcaster ────────────────────────────────────────────────────

class EventBroadcaster {
    private http: AxiosInstance;
    private disabled: boolean;
    private emitCount = 0;
    private failCount = 0;
    private lastFailLog = 0;

    constructor() {
        this.disabled = EVENTS_DISABLED;
        const secret = process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me';
        this.http = axios.create({
            timeout: EVENTS_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secret}`
            },
            // Don't throw on non-2xx — we handle gracefully.
            validateStatus: () => true,
        });
        if (this.disabled) {
            logger.info('[EventBroadcaster] Disabled via NEHA_EVENTS_DISABLED');
        } else {
            logger.info(
                `[EventBroadcaster] Emitting to ${EVENTS_ENDPOINT}` +
                ` (timeout=${EVENTS_TIMEOUT_MS}ms)`
            );
        }
    }

    /**
     * Emit a Neha lifecycle event. Fire-and-forget — returns void and
     * never throws. Safe to call from the hot path of the cognitive loop.
     */
    emit(event: NehaEvent | EmployeeEvent): void {
        if (this.disabled) return;

        this.emitCount++;
        // Detached promise — do not await.
        this.http
            .post(EVENTS_ENDPOINT, event)
            .then((res) => {
                if (res.status >= 400) {
                    this.recordFailure(
                        `CRM API returned status ${res.status}`
                    );
                }
            })
            .catch((err: any) => {
                this.recordFailure(
                    err?.code || err?.message || 'network error'
                );
            });
    }

    private recordFailure(reason: string): void {
        this.failCount++;
        // Throttle failure logging to once per 30s to avoid spam.
        const now = Date.now();
        if (now - this.lastFailLog > 30_000) {
            this.lastFailLog = now;
            logger.warn(
                `[EventBroadcaster] Emit failed (${this.failCount}/${this.emitCount} so far): ${reason}`
            );
        }
    }

    /** Health/stats for the dashboard's "broadcaster status" indicator. */
    getStats(): { enabled: boolean; emitted: number; failed: number } {
        return {
            enabled: !this.disabled,
            emitted: this.emitCount,
            failed: this.failCount,
        };
    }
}

const eventBroadcaster = new EventBroadcaster();

// Back-compat: keep the old default export name for Neha's existing imports.
const nehaEventBroadcaster = eventBroadcaster;
export default nehaEventBroadcaster;

// Generalized singleton for BaseCognitiveLoop (item 1.5).
export { eventBroadcaster };
