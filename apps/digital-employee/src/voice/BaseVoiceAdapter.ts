/**
 * BaseVoiceAdapter — Shared Voice Streaming Infrastructure
 *
 * Extracts the common streaming pipeline (ASR → speculative LLM → TTS,
 * barge-in, filler words) used by both VoiceAdapter (Rohan) and
 * MonikaVoiceAdapter, eliminating ~400 lines of copy-paste duplication.
 *
 * Subclasses override:
 *   - buildCognitiveInput()  — shape the input for their cognitive loop
 *   - runCognitiveLoop()     — invoke their specific agent
 *   - getPersonaEngine()     — return their persona engine
 *   - onGreeting()           — produce the initial greeting text
 *   - onPostCommit()         — hook after response is committed (e.g. Monika handoff)
 *   - getAdapterTag()        — log prefix string
 */

import { WebSocket } from 'ws';
import { logger } from '@zentrix/logger';
import { ASRProvider } from './ASRProvider';
import { TTSProvider } from './TTSProvider';
import { BargeInHandler } from './BargeInHandler';
import { FillerWordManager } from './FillerWordManager';
import { SupportedLanguage, DbAIEmployeePersona } from '@zentrix/types';

// ── Tunables ───────────────────────────────────────────────────────

/** Min interim transcript length before speculative LLM start. */
const SPECULATIVE_MIN_CHARS = 6;
/** Min stability (chars unchanged across interims) before speculative start. */
const SPECULATIVE_STABLE_INTERIMS = 2;
/** Max concurrent speculative starts per session (debounce). */
const SPECULATIVE_COOLDOWN_MS = 1200;

import { SentenceQueue } from './SentenceQueue';
import { DEFAULT_FILLERS } from './FillerWordManager';
import { CallScorer } from './CallScorer';

// ── Types ──────────────────────────────────────────────────────────

export interface BaseVoiceSession {
    sessionId: string;
    tenantId: number;
    personaId: string;
    leadId?: string;
    language: SupportedLanguage;
    ws: WebSocket;
    asr: ASRProvider;
    tts: TTSProvider;
    bargeIn: BargeInHandler;
    filler: FillerWordManager;
    isActive: boolean;

    // Sentence queue & streaming properties
    sentenceQueue?: SentenceQueue;
    speculativeSentences?: string[];
    streamedAny?: boolean;

    // Turn state
    interimText: string;
    lastInterimText: string;
    stableInterimCount: number;
    speculativeInFlight: boolean;
    speculativeResult: any | null;
    lastSpeculativeAt: number;
    turnFinalized: boolean;
    turnStartedAt: number;

    // Phase 3 outcome tracking
    startedAt?: number;
    turns?: Array<{ role: 'user' | 'agent'; text: string; timestamp: number }>;
}

export interface BaseVoiceLatencyMetrics {
    sessionId: string;
    asrFinalMs: number;
    llmMs: number;
    ttsFirstByteMs: number;
    totalMs: number;
    bargeIn: boolean;
}

export interface VoiceConnectionMetadata {
    sessionId: string;
    tenantId: number;
    personaId: string;
    leadId?: string;
    language?: SupportedLanguage;
    [key: string]: any;  // allow subclass-specific fields (callerName, callerPhone, etc.)
}

export interface PersonaEngine {
    getPersona(tenantId: number): Promise<DbAIEmployeePersona>;
    getVoiceForLanguage(persona: DbAIEmployeePersona, language: SupportedLanguage): string;
    getTTSParams(persona: DbAIEmployeePersona): { speed: number; pitch: number };
}

// ── BaseVoiceAdapter ───────────────────────────────────────────────

export abstract class BaseVoiceAdapter<
    TSession extends BaseVoiceSession = BaseVoiceSession,
    TMetrics extends BaseVoiceLatencyMetrics = BaseVoiceLatencyMetrics,
    TResult = any,
> {
    protected sessions = new Map<string, TSession>();
    protected metrics: TMetrics[] = [];
    protected static fillerAudioCache = new Map<string, Buffer>();

    // ── Abstract hooks (subclasses must implement) ──────────────────

    /** Return the log tag like '[VoiceAdapter]' or '[MonikaVoice]'. */
    protected abstract getAdapterTag(): string;

    /** Return the persona engine for voice/TTS params. */
    protected abstract getPersonaEngine(): PersonaEngine;

    /** Build the cognitive input for the agent's processCycle. */
    protected abstract buildCognitiveInput(session: TSession, transcript: string): any;

    /** Run the cognitive loop and return the result. */
    protected abstract runCognitiveLoop(input: any, onSentence?: (sentence: string) => void): Promise<TResult>;

    /** Create the initial session object from metadata. */
    protected abstract createSession(
        metadata: VoiceConnectionMetadata,
        ws: WebSocket,
        asr: ASRProvider,
        tts: TTSProvider,
        bargeIn: BargeInHandler,
        filler: FillerWordManager,
    ): TSession;

    /** Generate the greeting text for a new session. */
    protected abstract generateGreeting(persona: DbAIEmployeePersona, session: TSession): string | Promise<string>;

    /** Extract the response text and metadata from the cognitive result. */
    protected abstract extractResponse(result: TResult): {
        text: string;
        filler_prefix?: string;
        language: SupportedLanguage;
        latency_ms: number;
    };

    /** Hook after response is committed (e.g. Monika handoff evaluation). */
    protected abstract onPostCommit(session: TSession, result: TResult): Promise<void>;

    /** Build a barge-in metric entry for this adapter. */
    protected abstract buildBargeInMetric(session: TSession): TMetrics;

    /** Build a response metric entry for this adapter. */
    protected abstract buildResponseMetric(
        session: TSession,
        asrFinalMs: number,
        llmMs: number,
        ttsFirstByteMs: number,
        totalMs: number,
    ): TMetrics;

    // ── Connection handling ─────────────────────────────────────────

    async handleConnection(ws: WebSocket, metadata: VoiceConnectionMetadata): Promise<void> {
        const { sessionId, tenantId, language } = metadata;
        const tag = this.getAdapterTag();

        logger.info(`${tag} New voice session: ${sessionId} (tenant: ${tenantId})`);

        const asr = new ASRProvider(language || 'hinglish');
        const tts = new TTSProvider();
        const bargeIn = new BargeInHandler();
        const filler = new FillerWordManager(language || 'hinglish', undefined, undefined);

        const session = this.createSession(metadata, ws, asr, tts, bargeIn, filler);
        bargeIn.setOnBargeIn(() => {
            if (session.isActive && tts.isCurrentlyPlaying) {
                this.handleBargeIn(session);
            }
        });
        session.speculativeSentences = [];
        session.streamedAny = false;
        session.turns = [];
        session.startedAt = Date.now();
        this.sessions.set(sessionId, session);

        // Wire filler callback
        filler.onDue((fillerText) => {
            if (!session.isActive || ws.readyState !== WebSocket.OPEN) return;
            
            const engine = this.getPersonaEngine();
            engine.getPersona(tenantId).then((persona) => {
                const voiceId = engine.getVoiceForLanguage(persona, session.language);
                const key = `${voiceId}_${fillerText}`;
                const cached = BaseVoiceAdapter.fillerAudioCache.get(key);
                if (cached) {
                    logger.info(`${tag} Playing CACHED filler: "${fillerText}"`);
                    session.bargeIn.setTTSPlaying(true);
                    session.tts.streamBuffer(cached, ws)
                        .finally(() => {
                            session.bargeIn.setTTSPlaying(false);
                        });
                } else {
                    logger.info(`${tag} Cache miss for filler: "${fillerText}" - streaming fresh`);
                    this.streamText(session, fillerText).catch((e) =>
                        logger.warn(`${tag} filler stream failed: ${e.message}`)
                    );
                }
            }).catch((err) => {
                this.streamText(session, fillerText).catch((e) =>
                    logger.warn(`${tag} filler stream failed: ${e.message}`)
                );
            });
        });

        // ASR transcript handling
        asr.onTranscript(async (transcript: string, isFinal: boolean) => {
            if (!session.isActive) return;
            if (!isFinal) {
                this.handleInterim(session, transcript);
                return;
            }
            await this.handleFinal(session, transcript);
        });

        // Incoming audio frames from telephony
        ws.on('message', (data: Buffer) => {
            if (!session.isActive) return;
            asr.feedAudio(data);
            if (tts.isCurrentlyPlaying) {
                bargeIn.feedAudio(data);
            }
        });

        ws.on('close', () => {
            logger.info(`${tag} Session closed: ${sessionId}`);
            this.cleanup(sessionId);
        });

        ws.on('error', (err) => {
            logger.error(`${tag} WebSocket error (${sessionId}): ${err.message}`);
            this.cleanup(sessionId);
        });

        // Initial greeting
        try {
            const engine = this.getPersonaEngine();
            const persona = await engine.getPersona(tenantId);
            filler.setPool(session.language, persona.persona_config.filler_words);

            const greeting = await this.generateGreeting(persona, session);
            const voiceId = engine.getVoiceForLanguage(persona, session.language);
            const ttsParams = engine.getTTSParams(persona);

            // Initialize SentenceQueue
            session.sentenceQueue = new SentenceQueue(
                tts,
                ws,
                voiceId,
                ttsParams,
                session.language,
                (isPlaying) => {
                    bargeIn.setTTSPlaying(isPlaying);
                }
            );

            // Warm up filler cache asynchronously
            const fillersPool = persona.persona_config.filler_words || [];
            const fillersToCache = fillersPool.length ? fillersPool : DEFAULT_FILLERS[session.language] || [];
            for (const text of fillersToCache) {
                const key = `${voiceId}_${text}`;
                if (!BaseVoiceAdapter.fillerAudioCache.has(key)) {
                    logger.info(`${tag} Pre-synthesizing filler: "${text}"`);
                    tts.synthesizeToBuffer(text, voiceId, ttsParams, session.language)
                        .then((buf) => {
                            BaseVoiceAdapter.fillerAudioCache.set(key, buf);
                            logger.info(`${tag} Cached filler: "${text}" (${buf.length} bytes)`);
                        })
                        .catch((e) => {
                            logger.warn(`${tag} Failed to pre-synthesize filler "${text}": ${e.message}`);
                        });
                }
            }

            bargeIn.setTTSPlaying(true);
            await tts.synthesizeAndStream(greeting, voiceId, ttsParams, ws, session.language);
            bargeIn.setTTSPlaying(false);
            logger.info(`${tag} Greeting sent for session ${sessionId}`);
        } catch (err: any) {
            logger.warn(`${tag} Greeting failed (${sessionId}): ${err.message}`);
        }
    }

    // ── Interim transcript → speculative LLM start ──────────────────

    private handleInterim(session: TSession, transcript: string): void {
        session.interimText = transcript;

        if (transcript.startsWith(session.lastInterimText) && transcript.length > session.lastInterimText.length) {
            session.stableInterimCount++;
        } else {
            session.stableInterimCount = 0;
        }
        session.lastInterimText = transcript;

        const now = Date.now();
        const cooldownOk = now - session.lastSpeculativeAt > SPECULATIVE_COOLDOWN_MS;
        const longEnough = transcript.length >= SPECULATIVE_MIN_CHARS;
        const stableEnough = session.stableInterimCount >= SPECULATIVE_STABLE_INTERIMS;

        if (cooldownOk && longEnough && stableEnough && !session.speculativeInFlight && !session.turnFinalized) {
            this.startSpeculative(session, transcript);
        }
    }

    private startSpeculative(session: TSession, transcript: string): void {
        const tag = this.getAdapterTag();
        session.speculativeInFlight = true;
        session.lastSpeculativeAt = Date.now();
        if (!session.turnStartedAt) session.turnStartedAt = Date.now();
        session.speculativeSentences = [];
        session.streamedAny = false;

        logger.info(`${tag} Speculative LLM start (${session.sessionId}): "${transcript.substring(0, 40)}..."`);

        const input = this.buildCognitiveInput(session, transcript);

        const onSentence = (sentence: string) => {
            if (!session.isActive) return;
            session.streamedAny = true;
            if (session.turnFinalized) {
                session.filler.disarm();
                if (session.sentenceQueue) {
                    session.sentenceQueue.push(sentence);
                }
            } else {
                if (!session.speculativeSentences) {
                    session.speculativeSentences = [];
                }
                session.speculativeSentences.push(sentence);
            }
        };

        this.runCognitiveLoop(input, onSentence)
            .then((result) => {
                if (!session.isActive) return;
                session.speculativeResult = result;
                session.speculativeInFlight = false;
                if (session.turnFinalized) {
                    this.commitResponse(session, result).catch((e) =>
                        logger.error(`${tag} speculative commit failed: ${e.message}`)
                    );
                }
            })
            .catch((err) => {
                session.speculativeInFlight = false;
                logger.warn(`${tag} Speculative LLM failed: ${err.message}`);
            });
    }

    // ── Final transcript → commit turn ──────────────────────────────

    private async handleFinal(session: TSession, transcript: string): Promise<void> {
        if (!transcript) return;
        session.turns?.push({ role: 'user', text: transcript, timestamp: Date.now() });
        const tag = this.getAdapterTag();
        const asrFinalAt = Date.now();
        if (!session.turnStartedAt) session.turnStartedAt = asrFinalAt;
        const asrFinalMs = asrFinalAt - session.turnStartedAt;

        logger.info(`${tag} Final transcript (${session.sessionId}): "${transcript}" (asr=${asrFinalMs}ms)`);

        session.turnFinalized = true;
        session.filler.arm();

        let result: TResult | null = session.speculativeResult;
        const speculativeMatches =
            result && transcript.trim().toLowerCase() === session.interimText.trim().toLowerCase();

        if (speculativeMatches && result) {
            logger.info(`${tag} Reusing speculative result (${session.sessionId})`);
            // Flush buffered speculative sentences
            if (session.speculativeSentences && session.speculativeSentences.length > 0) {
                session.filler.disarm();
                for (const sentence of session.speculativeSentences) {
                    session.sentenceQueue?.push(sentence);
                }
                session.speculativeSentences = [];
            }
        } else {
            // Discard speculative results if mismatch
            session.speculativeSentences = [];
            session.streamedAny = false;
            if (session.sentenceQueue) {
                session.sentenceQueue.clear();
            }
            if (session.speculativeInFlight) {
                result = await this.waitForSpeculative(session, 200);
            }
            if (!result) {
                const input = this.buildCognitiveInput(session, transcript);

                const onSentence = (sentence: string) => {
                    if (!session.isActive || !session.turnFinalized) return;
                    session.streamedAny = true;
                    session.filler.disarm();
                    if (session.sentenceQueue) {
                        session.sentenceQueue.push(sentence);
                    }
                };

                result = await this.runCognitiveLoop(input, onSentence);
            }
        }

        if (!session.isActive || !result) return;
        await this.commitResponse(session, result, asrFinalMs);
    }

    private async waitForSpeculative(session: TSession, timeoutMs: number): Promise<TResult | null> {
        const start = Date.now();
        while (session.speculativeInFlight && Date.now() - start < timeoutMs) {
            await new Promise((r) => setTimeout(r, 20));
        }
        return session.speculativeResult;
    }

    // ── Commit: stream the response via TTS ──────────────────────────

    private async commitResponse(session: TSession, result: TResult, asrFinalMs = 0): Promise<void> {
        const tag = this.getAdapterTag();
        const response = this.extractResponse(result);
        const llmMs = response.latency_ms;

        // Record agent response turn
        session.turns?.push({ role: 'agent', text: response.text, timestamp: Date.now() });

        try {
            const engine = this.getPersonaEngine();
            const persona = await engine.getPersona(session.tenantId);
            const voiceId = engine.getVoiceForLanguage(persona, response.language);
            const ttsParams = engine.getTTSParams(persona);

            session.filler.disarm();
            const ttsStart = Date.now();

            // Stream only if we haven't already streamed chunk-by-chunk
            if (!session.streamedAny) {
                if (response.filler_prefix) {
                    await this.streamText(session, response.filler_prefix, voiceId, ttsParams);
                }
                await this.streamText(session, response.text, voiceId, ttsParams);
            } else {
                logger.info(`${tag} Skinned commitResponse playing (already streamed via SentenceQueue)`);
            }

            const totalMs = Date.now() - session.turnStartedAt;
            const ttsFirstByteMs = Date.now() - ttsStart;

            // Subclass post-commit hook (e.g. Monika handoff evaluation)
            await this.onPostCommit(session, result);

            const metric = this.buildResponseMetric(session, asrFinalMs, llmMs, ttsFirstByteMs, totalMs);
            this.recordMetric(metric);

            logger.info(
                `${tag} Response sent (${session.sessionId}): ` +
                `asr=${asrFinalMs}ms llm=${llmMs}ms tts1st=${ttsFirstByteMs}ms total=${totalMs}ms`
            );
        } catch (err: any) {
            logger.error(`${tag} commitResponse error (${session.sessionId}): ${err.message}`);
        } finally {
            this.resetTurn(session);
        }
    }

    protected async streamText(
        session: TSession,
        text: string,
        voiceId?: string,
        ttsParams?: { speed: number; pitch: number },
    ): Promise<void> {
        if (!session.isActive || !text) return;
        const ws = session.ws;
        if (ws.readyState !== WebSocket.OPEN) return;

        if (!voiceId || !ttsParams) {
            const engine = this.getPersonaEngine();
            const persona = await engine.getPersona(session.tenantId);
            voiceId = engine.getVoiceForLanguage(persona, session.language);
            ttsParams = engine.getTTSParams(persona);
        }

        session.bargeIn.setTTSPlaying(true);
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send('clear');
            }
            await session.tts.synthesizeAndStream(text, voiceId, ttsParams, ws, session.language);
        } finally {
            session.bargeIn.setTTSPlaying(false);
        }
    }

    // ── Barge-in handling ───────────────────────────────────────────

    private handleBargeIn(session: TSession): void {
        const tag = this.getAdapterTag();
        logger.info(`${tag} Barge-in → stopping TTS + cancelling LLM (${session.sessionId})`);

        if (session.sentenceQueue) {
            session.sentenceQueue.clear();
        }
        session.tts.stop();
        session.bargeIn.setTTSPlaying(false);
        session.filler.disarm();
        session.speculativeInFlight = false;
        session.speculativeResult = null;
        session.turnFinalized = false;
        session.speculativeSentences = [];
        session.streamedAny = false;

        // Send clear command to the voice bridge to flush buffered audio
        if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send('clear');
        }

        this.recordMetric(this.buildBargeInMetric(session));
        this.resetTurn(session);
    }

    // ── Turn lifecycle ──────────────────────────────────────────────

    private resetTurn(session: TSession): void {
        session.interimText = '';
        session.lastInterimText = '';
        session.stableInterimCount = 0;
        session.speculativeInFlight = false;
        session.speculativeResult = null;
        session.turnFinalized = false;
        session.turnStartedAt = 0;
        session.speculativeSentences = [];
        session.streamedAny = false;
    }

    // ── Metrics ─────────────────────────────────────────────────────

    private recordMetric(metric: TMetrics): void {
        this.metrics.push(metric);
        if (this.metrics.length > 200) this.metrics.shift();
    }

    getMetrics(): TMetrics[] {
        return [...this.metrics];
    }

    getAggregateLatency() {
        const completed = this.metrics.filter((m) => !m.bargeIn && m.totalMs > 0);
        if (!completed.length) {
            return {
                count: 0,
                avgTotalMs: 0,
                avgAsrMs: 0,
                avgLlmMs: 0,
                avgTtsFirstByteMs: 0,
                bargeInCount: this.metrics.filter((m) => m.bargeIn).length,
            };
        }
        const sum = (f: (m: TMetrics) => number) => completed.reduce((a, m) => a + f(m), 0);
        return {
            count: completed.length,
            avgTotalMs: Math.round(sum((m) => m.totalMs) / completed.length),
            avgAsrMs: Math.round(sum((m) => m.asrFinalMs) / completed.length),
            avgLlmMs: Math.round(sum((m) => m.llmMs) / completed.length),
            avgTtsFirstByteMs: Math.round(sum((m) => m.ttsFirstByteMs) / completed.length),
            bargeInCount: this.metrics.filter((m) => m.bargeIn).length,
        };
    }

    // ── Cleanup ─────────────────────────────────────────────────────

    private cleanup(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            const tag = this.getAdapterTag();
            session.isActive = false;
            session.asr.stop();
            session.tts.stop();
            if (session.sentenceQueue) {
                session.sentenceQueue.clear();
            }
            session.filler.disarm();
            if (session.ws.readyState === WebSocket.OPEN) {
                session.ws.send('clear');
            }

            // Score call outcome and save transcript asynchronously
            if (session.turns && session.turns.length > 0) {
                const duration = Math.round((Date.now() - session.startedAt) / 1000);
                CallScorer.scoreCall(
                    session.tenantId.toString(),
                    session.leadId,
                    session.personaId,
                    session.turns,
                    duration
                ).catch((err) => {
                    logger.error(`${tag} Async call scoring failed: ${err.message}`);
                });
            }

            this.sessions.delete(sessionId);
        }
    }

    getActiveSessionCount(): number {
        return this.sessions.size;
    }
}
