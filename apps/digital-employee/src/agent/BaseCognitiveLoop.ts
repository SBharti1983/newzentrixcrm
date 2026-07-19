/**
 * BaseCognitiveLoop — Shared Two-Track Cognitive Loop Orchestrator
 *
 * Implements the template-method pattern for the AI Digital Employees
 * (Rohan / Monika / Neha). All three agents share an identical Track A /
 * Track B orchestration skeleton:
 *
 *   1. Fetch persona
 *   2. Load per-employee context
 *   3. Update conversation state with the incoming user message
 *   4. Build the Track A (fast) prompt
 *   5. Generate the Track A response — streamed via SentenceStreamer so
 *      every employee gets chunk-by-chunk TTS (item 1.4 / 3.1)
 *   6. Get or create the Postgres memory tracker
 *   7. Fire Track B (reasoning) as a background promise:
 *        a. executeReasoning()  — delegates to the per-employee reasoning
 *           module, wrapped in validation (item 4.1) + timeout/abort
 *           (item 1.3) + a single repair retry (item 4.3)
 *        b. applyReasoningSideEffects() — escalation (Rohan), scheduling +
 *           handoff (Monika), filing + handoff (Neha)
 *        c. persist conversation_state + invalidate context cache
 *        d. audit log
 *   8. On any Track B failure, degrade gracefully with a fallback reasoning
 *      (item 1.2) — still persisting state + invalidating the cache so the
 *      next turn starts clean. This guarantees parity across all three
 *      employees (previously only Rohan degraded; Monika/Neha re-threw).
 *
 * Subclasses implement only the hooks that differ:
 *   - loadContext()
 *   - buildFastPrompt()
 *   - executeReasoning()
 *   - normalizeReasoning()       — per-employee default-filling
 *   - validateReasoningOutput()  — per-employee schema check (item 4.1)
 *   - buildFallbackReasoning()   — per-employee safe default
 *   - applyReasoningSideEffects() — escalation / scheduling / filing
 *   - getMemoryKey()             — lead_id vs caller:phone keying
 *   - emitTurnEvents()           — per-employee observability hooks (1.5)
 *
 * NOTE: This module lives inside apps/digital-employee to run on a
 * dedicated Node.js event loop, isolated from CRM API traffic in apps/api.
 */

import { logger } from '@zentrix/logger';
import { streamSentences, cleanResponseText } from '../cognition/SentenceStreamer';
import { generateAIResponse, generateAIResponseStream } from '../ai/AIService';
import rohanMemory from '../memory/MemoryService';
import crmUpdater from '../integrations/crm/CrmUpdater';
import {
    CognitiveInput,
    CognitiveResult,
    FastResponse,
    ConversationState,
    SupportedLanguage,
    DbAIEmployeePersona,
} from '@zentrix/types';
import { eventBroadcaster, EmployeeRole } from '../observability/EventBroadcaster';

/**
 * Structural shape satisfied by all three cognitive-result variants
 * (CognitiveResult, ReceptionistCognitiveResult, AccountantCognitiveResult).
 * The base loop only requires these four fields; the per-employee
 * `reasoning_promise` may resolve to a different reasoning type, so we
 * cannot pin the constraint to `CognitiveResult` (which hard-codes
 * `Promise<ReasoningOutput>`).
 */
export interface CognitiveResultShape {
    fast_response: FastResponse;
    reasoning_promise: Promise<any>;
    memory_id: string;
    turn_number: number;
}

// ── Track B timeout / abort configuration (item 1.3) ─────────────────
const DEFAULT_REASONING_TIMEOUT_MS =
    Number(process.env.REASONING_TIMEOUT_MS) || 8000;

/**
 * Result of a reasoning validation pass (item 4.1).
 * `valid` is false when required fields are missing; `missing` lists the
 * field paths that were absent so the repair retry can mention them.
 */
export interface ReasoningValidationResult {
    valid: boolean;
    missing: string[];
}

/**
 * Generic reasoning shape — each employee's reasoning type is structurally
 * compatible (intent / emotion / emotion_score / action / response /
 * missing_info / next_goal / crm_update). The base loop treats reasoning
 * as `any` internally and relies on the subclass validator + normalizer
 * to guarantee shape before downstream code runs.
 */
type AnyReasoning = any;

/**
 * Abstract base class. Concrete subclasses (RohanCognitiveLoop,
 * MonikaCognitiveLoop, NehaCognitiveLoop) provide the per-employee hooks.
 *
 * Three generic parameters:
 *  - TInput   — the cognitive input shape (CognitiveInput | Receptionist... | Accountant...)
 *  - TContext — the context bundle shape (RohanContext | MonikaContext | NehaContext)
 *  - TResult  — the cognitive result shape returned to the voice adapter
 *  - TReasoning — the reasoning output shape
 */
export abstract class BaseCognitiveLoop<
    TInput extends CognitiveInput = CognitiveInput,
    TContext = any,
    TResult extends CognitiveResultShape = CognitiveResult,
    TReasoning = AnyReasoning,
> {
    // ── Abstract hooks (subclasses must implement) ──────────────────

    /** Log tag, e.g. '[RohanCognitiveLoop]'. */
    protected abstract readonly logTag: string;

    /** The AI employee role this loop manages ('rohan' | 'monika' | 'neha'). */
    protected abstract readonly role: EmployeeRole;

    /** Fetch this employee's persona for the tenant. */
    protected abstract fetchPersona(tenantId: number): Promise<DbAIEmployeePersona>;

    /**
     * Load the per-employee context bundle (lead / caller / staff directory /
     * filings / FAQs ...). Must populate `conversation_state`.
     */
    protected abstract loadContext(
        input: TInput,
        persona: DbAIEmployeePersona
    ): Promise<TContext>;

    /** Build the Track A (fast) system prompt. */
    protected abstract buildFastPrompt(
        persona: DbAIEmployeePersona,
        context: TContext
    ): string;

    /**
     * Execute the Track B reasoning call (delegates to the per-employee
     * reasoning module). The base loop wraps this with validation,
     * timeout, and a repair retry — subclasses only need to issue the
     * LLM call and return the raw parsed object.
     *
     * An optional `signal` is provided so subclasses can thread it through
     * to the underlying provider for cancellation (item 1.3 / 3.3).
     */
    protected abstract executeReasoning(
        persona: DbAIEmployeePersona,
        context: TContext,
        userMessage: string,
        signal?: AbortSignal
    ): Promise<TReasoning>;

    /**
     * Normalize the raw LLM JSON into a valid reasoning object, filling
     * defaults for any missing optional fields (item 4.1, step 3).
     */
    protected abstract normalizeReasoning(raw: any): TReasoning;

    /**
     * Validate the raw reasoning object's required fields (item 4.1).
     * Returns `{ valid, missing }`. The base loop uses this to decide
     * whether to attempt a repair retry (item 4.3).
     */
    protected abstract validateReasoningOutput(raw: any): ReasoningValidationResult;

    /**
     * Build a safe fallback reasoning object used when Track B fails or
     * times out (item 1.2). Must be a fully-shaped, downstream-safe
     * object — no `undefined` required fields.
     */
    protected abstract buildFallbackReasoning(
        context: TContext,
        cleanText: string
    ): TReasoning;

    /**
     * Apply per-employee Track B side effects after reasoning succeeds:
     * escalation (Rohan), scheduling + handoff (Monika), filing + handoff
     * (Neha). Runs *before* state persistence so side-effects can stamp
     * fields onto the reasoning object if needed.
     */
    protected abstract applyReasoningSideEffects(
        input: TInput,
        persona: DbAIEmployeePersona,
        context: TContext,
        reasoning: TReasoning,
        memoryId: string
    ): Promise<void>;

    /**
     * Compute the memory key for this turn — lead_id for Rohan,
     * `caller:{phone}` for Monika/Neha. Used for state persistence +
     * cache invalidation.
     */
    protected abstract getMemoryKey(input: TInput): string;

    /**
     * Build the updated ConversationState from the reasoning output.
     * Shared shape across all three employees; subclasses may override
     * if they need extra fields.
     */
    protected buildUpdatedState(
        context: TContext,
        reasoning: TReasoning,
        responseLanguage: SupportedLanguage
    ): ConversationState {
        const cs: ConversationState = (context as any).conversation_state;
        const r = reasoning as any;
        return {
            ...cs,
            language_detected: (cs.language_detected || responseLanguage) as SupportedLanguage,
            emotion_trend: [...cs.emotion_trend, r.emotion].slice(-5),
            current_goal: r.next_goal || cs.current_goal,
            missing_info: r.missing_info || cs.missing_info,
            objections_raised: cs.objections_raised,
            next_action: r.action || cs.next_action,
        };
    }

    /**
     * Per-turn observability hook (item 1.5). The base implementation emits
     * generic `employee:turn_started`, `employee:track_a_response`,
     * `employee:reasoning_complete`, `employee:reasoning_failed` events for
     * all three employees via the shared EventBroadcaster. Neha overrides
     * this to keep its existing `neha:*` event stream (and avoid double
     * emission).
     */
    protected emitTurnEvents(event: {
        type: 'turn_started' | 'track_a_response' | 'reasoning_complete' | 'reasoning_failed';
        input: TInput;
        persona: DbAIEmployeePersona;
        context: TContext;
        payload?: any;
    }): void {
        const { input, persona, context, payload } = event;
        const { tenant_id, lead_id, user_phone, caller_name, channel } = input as any;
        const turnNumber =
            payload?.turn_number ?? (context as any).conversation_state?.turn_count;
        const ts = Date.now();

        switch (event.type) {
            case 'turn_started':
                eventBroadcaster.emit({
                    type: 'employee:turn_started',
                    role: this.role,
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    user_message: payload?.user_message || '',
                    detected_language: payload?.detected_language,
                    timestamp: ts,
                });
                break;

            case 'track_a_response':
                eventBroadcaster.emit({
                    type: 'employee:track_a_response',
                    role: this.role,
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    response_text: payload?.response_text || '',
                    latency_ms: payload?.latency_ms || 0,
                    language: payload?.language,
                    filler_prefix: payload?.filler_prefix,
                    timestamp: ts,
                });
                break;

            case 'reasoning_complete': {
                const r = payload?.reasoning || {};
                // item 4.5: distinguish null (unknown) from a numeric score.
                const rawScore = r.emotion_score;
                const confidence = typeof rawScore === 'number' ? rawScore : null;
                eventBroadcaster.emit({
                    type: 'employee:reasoning_complete',
                    role: this.role,
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    intent: r.intent || 'unknown',
                    action: r.action || 'none',
                    emotion: r.emotion || 'neutral',
                    confidence,
                    reasoning_latency_ms: payload?.reasoning_latency_ms || 0,
                    total_latency_ms: payload?.total_latency_ms || 0,
                    next_goal: r.next_goal,
                    missing_info: r.missing_info,
                    timestamp: ts,
                });
                break;
            }

            case 'reasoning_failed':
                eventBroadcaster.emit({
                    type: 'employee:reasoning_failed',
                    role: this.role,
                    tenant_id,
                    persona_id: persona.id,
                    lead_id: lead_id || null,
                    caller_phone: user_phone,
                    caller_name,
                    channel,
                    turn_number: turnNumber,
                    error: payload?.error || 'unknown',
                    used_fallback: true,
                    timestamp: ts,
                });
                break;
        }
    }

    // ── Template method: process a single conversation turn ─────────

    /**
     * Process a single turn of conversation.
     * Generates the Track A response synchronously (streaming it via
     * `onSentence` when provided), and fires Track B reasoning as a
     * background promise that resolves with the (validated, normalized)
     * reasoning object — or a fallback on failure/timeout.
     */
    async processCycle(
        input: TInput,
        onSentence?: (sentence: string) => void
    ): Promise<TResult> {
        const startTime = Date.now();
        const { tenant_id, lead_id, channel, user_message, detected_language } = input;

        // 1. Fetch persona
        const persona = await this.fetchPersona(tenant_id);

        // 2. Load context
        const context = await this.loadContext(input, persona);

        // 3. Update conversation state with the incoming user message
        const cs = (context as any).conversation_state as ConversationState;
        cs.last_user_message = user_message;
        cs.turn_count += 1;

        // Determine output language
        const responseLanguage: SupportedLanguage =
            (detected_language || cs.language_detected || 'hinglish') as SupportedLanguage;

        // ── Event: turn started (item 1.5) ──
        this.emitTurnEvents({
            type: 'turn_started',
            input,
            persona,
            context,
            payload: {
                turn_number: cs.turn_count,
                user_message,
                detected_language: detected_language || undefined,
            },
        });

        // 4. Build Track A fast prompt
        const fastPrompt = this.buildFastPrompt(persona, context);

        // 5. Generate Track A response — streamed via SentenceStreamer (item 1.4)
        const trackAStart = Date.now();
        const promptSuffix = `\n\n${this.userMessageLabel()}: ${user_message}\n\nGenerate ${this.employeeName(persona)}'s conversational response:`;
        const fullPrompt = `System Prompt:\n${fastPrompt}${promptSuffix}`;

        let responseTextRaw = '';
        if (onSentence) {
            const stream = generateAIResponseStream(fullPrompt, false);
            responseTextRaw = await streamSentences(stream, onSentence);
        } else {
            responseTextRaw = await generateAIResponse(fullPrompt, false);
        }
        const trackALatency = Date.now() - trackAStart;

        const cleanText = cleanResponseText(responseTextRaw);

        // 6. Filler prefix for voice
        let fillerPrefix: string | undefined = undefined;
        if (channel === 'voice') {
            fillerPrefix = this.getFillerPrefix(persona) || undefined;
        }

        // 7. Build FastResponse
        const fastResponse: FastResponse = {
            text: cleanText,
            language: responseLanguage,
            filler_prefix: fillerPrefix,
            confidence: 1.0,
            latency_ms: trackALatency,
        };

        // ── Event: Track A response ready (item 1.5) ──
        this.emitTurnEvents({
            type: 'track_a_response',
            input,
            persona,
            context,
            payload: {
                turn_number: cs.turn_count,
                response_text: cleanText,
                latency_ms: trackALatency,
                language: responseLanguage,
                filler_prefix: fillerPrefix,
            },
        });

        const turnNumber = cs.turn_count;

        // 8. Get or create Postgres memory tracker
        const memoryKey = this.getMemoryKey(input);
        const memory = await rohanMemory.getOrCreateMemory(
            tenant_id,
            persona.id,
            memoryKey,
            channel
        );

        // Stamp the response onto the state for Track B's thinking context
        cs.last_rohan_message = cleanText;

        // 9. Fire Track B background reasoning (with validation + timeout + repair)
        const reasoningPromise = (async (): Promise<TReasoning> => {
            const trackBStart = Date.now();
            try {
                const reasoning = await this.runReasoningWithGuards(
                    persona,
                    context,
                    user_message
                );
                const reasoningLatency = Date.now() - trackBStart;

                // Save reasoning to memory
                await rohanMemory.saveReasoning(memory.id, reasoning as any);

                // Apply per-employee side effects (escalation / scheduling / filing)
                await this.applyReasoningSideEffects(input, persona, context, reasoning, memory.id);

                // Apply CRM updates (shared across all three)
                if (lead_id && (reasoning as any).crm_update) {
                    await this.applyCrmUpdates(tenant_id, lead_id, (reasoning as any).crm_update, reasoning);
                }

                // Update + persist conversation state
                const updatedState = this.buildUpdatedState(context, reasoning, responseLanguage);
                await rohanMemory.saveConversationState(tenant_id, memoryKey, updatedState, memory.id);
                await rohanMemory.invalidateContextCache(tenant_id, memoryKey);

                // Audit log
                const totalLatency = Date.now() - startTime;
                await rohanMemory.logReasoning(
                    tenant_id,
                    persona.id,
                    lead_id,
                    memory.id,
                    turnNumber,
                    channel,
                    user_message,
                    reasoning as any,
                    cleanText,
                    totalLatency,
                    reasoningLatency
                );

                // ── Event: reasoning complete (item 1.5) ──
                this.emitTurnEvents({
                    type: 'reasoning_complete',
                    input,
                    persona,
                    context,
                    payload: {
                        turn_number: turnNumber,
                        reasoning,
                        reasoning_latency_ms: reasoningLatency,
                        total_latency_ms: totalLatency,
                    },
                });

                return reasoning;
            } catch (err: any) {
                logger.error(`${this.logTag} Track B background reasoning failed: ${err.message}`);

                // ── Event: reasoning failed (item 1.5) ──
                this.emitTurnEvents({
                    type: 'reasoning_failed',
                    input,
                    persona,
                    context,
                    payload: { error: err.message, turn_number: turnNumber },
                });

                // Degrade gracefully — return a fallback reasoning so the
                // promise resolves instead of leaving an unhandled rejection
                // that silently drifts lead state (item 1.2). Still persist
                // state + invalidate the cache so the next turn starts clean.
                const fallback = this.buildFallbackReasoning(context, cleanText);
                try {
                    await rohanMemory.saveReasoning(memory.id, fallback as any);
                    const updatedState = this.buildUpdatedState(context, fallback, responseLanguage);
                    await rohanMemory.saveConversationState(tenant_id, memoryKey, updatedState, memory.id);
                    await rohanMemory.invalidateContextCache(tenant_id, memoryKey);
                } catch (persistErr: any) {
                    logger.error(`${this.logTag} Fallback state persist failed: ${persistErr.message}`);
                }
                return fallback;
            }
        })();

        return {
            fast_response: fastResponse,
            reasoning_promise: reasoningPromise,
            memory_id: memory.id,
            turn_number: turnNumber,
        } as unknown as TResult;
    }

    // ── Reasoning guards: validation + timeout + repair retry ────────

    /**
     * Run the subclass reasoning executor wrapped in:
     *   - a timeout (item 1.3) — rejects after REASONING_TIMEOUT_MS
     *   - validation (item 4.1) — required fields checked
     *   - a single repair retry (item 4.3) — re-prompt with the schema
     *   - normalization — defaults filled for missing optional fields
     *
     * On timeout or unrecoverable validation failure, throws so the
     * outer catch in `processCycle` produces a fallback reasoning.
     */
    private async runReasoningWithGuards(
        persona: DbAIEmployeePersona,
        context: TContext,
        userMessage: string
    ): Promise<TReasoning> {
        const controller = new AbortController();
        const timeoutMs = this.reasoningTimeoutMs();

        let raw: any;
        try {
            raw = await this.withTimeout(
                this.executeReasoning(persona, context, userMessage, controller.signal),
                timeoutMs,
                controller,
                'reasoning'
            );
        } catch (err: any) {
            // Timeout or provider error — let the outer catch produce a fallback.
            throw err;
        }

        // Validate (item 4.1)
        const validation = this.validateReasoningOutput(raw);
        if (!validation.valid) {
            logger.warn(
                `${this.logTag} Reasoning schema violation (missing: ${validation.missing.join(', ')}). ` +
                `Attempting repair retry...`
            );
            // Single repair retry (item 4.3)
            try {
                const repaired = await this.repairReasoning(persona, context, userMessage, raw, validation.missing);
                const repairValidation = this.validateReasoningOutput(repaired);
                if (repairValidation.valid) {
                    return this.normalizeReasoning(repaired);
                }
                logger.warn(`${this.logTag} Repair retry still invalid (missing: ${repairValidation.missing.join(', ')}). Normalizing with defaults.`);
                return this.normalizeReasoning(repaired);
            } catch (repairErr: any) {
                logger.warn(`${this.logTag} Repair retry failed: ${repairErr.message}. Normalizing original with defaults.`);
                return this.normalizeReasoning(raw);
            }
        }

        return this.normalizeReasoning(raw);
    }

    /**
     * Race a promise against a timeout. On timeout, abort the in-flight
     * request via the AbortController and reject with a timeout error
     * (item 1.3).
     */
    private withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController, label: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                controller.abort();
                logger.error(`${this.logTag} ${label} timed out after ${ms}ms — aborting.`);
                reject(new Error(`${label}_timeout`));
            }, ms);

            promise
                .then((v) => {
                    clearTimeout(timer);
                    resolve(v);
                })
                .catch((err) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    /** Override to customize the reasoning timeout (default 8s, item 1.3). */
    protected reasoningTimeoutMs(): number {
        return DEFAULT_REASONING_TIMEOUT_MS;
    }

    /**
     * Repair retry (item 4.3). Default implementation re-invokes the
     * subclass reasoning executor with a repair preamble appended to the
     * user message. Subclasses may override to use a dedicated repair
     * prompt.
     */
    protected async repairReasoning(
        persona: DbAIEmployeePersona,
        context: TContext,
        userMessage: string,
        badOutput: any,
        missing: string[]
    ): Promise<any> {
        const repairPreamble =
            `Your previous response was not valid JSON or was missing required fields (${missing.join(', ')}). ` +
            `Return ONLY a JSON object with all required fields. Previous response was:\n${JSON.stringify(badOutput).slice(0, 500)}\n\n`;
        // Re-run the reasoning executor with the repair preamble prepended.
        // Subclasses' executeReasoning builds its own prompt from context, so
        // we pass the augmented message as the user message.
        return this.executeReasoning(persona, context, repairPreamble + userMessage);
    }

    // ── Shared helpers (overridable) ────────────────────────────────

    /** Label for the user's message in the fast prompt (Lead/Caller). */
    protected userMessageLabel(): string {
        return 'Lead Message';
    }

    /** The employee's first name, used in the fast prompt suffix. */
    protected employeeName(persona: DbAIEmployeePersona): string {
        return persona.employee_name || 'the agent';
    }

    /** Return a random filler prefix for voice turns. Default: none. */
    protected getFillerPrefix(_persona: DbAIEmployeePersona): string | null {
        return null;
    }

    /**
     * Apply CRM updates. Rohan has extra automation triggers; the base
     * just calls crmUpdater.applyCRMUpdates. Subclasses override to add
     * automations (Rohan) or other side effects.
     */
    protected async applyCrmUpdates(
        tenantId: number,
        leadId: string,
        crmUpdate: any,
        reasoning: TReasoning
    ): Promise<void> {
        await crmUpdater.applyCRMUpdates(tenantId, leadId, crmUpdate);
    }
}
