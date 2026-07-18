/**
 * ASRProvider — Ultra-Low Latency Streaming Speech-to-Text
 *
 * Connects to Sarvam AI (primary) or Deepgram (fallback) for real-time audio
 * transcription over a streaming WebSocket. Emits interim and final transcripts
 * as audio frames arrive so the cognitive loop can start early on partial results.
 *
 * Design goals:
 *   - First transcript latency < 300ms (streaming, not batch)
 *   - Provider-agnostic interface (swap Sarvam ↔ Deepgram without callers changing)
 *   - Graceful degradation: if no provider configured, runs in "passthrough" mode
 *     so the pipeline still works for local/integration testing.
 *
 * Audio contract:
 *   - 16-bit PCM, 16 kHz, mono, little-endian (mulaw decode handled upstream)
 */

import { logger } from '@zentrix/logger';
import { SupportedLanguage } from '@zentrix/types';
import { WebSocket } from 'ws';

// ── Types ───────────────────────────────────────────────────────────

export type TranscriptCallback = (transcript: string, isFinal: boolean, confidence?: number) => void;

export type AsrProvider = 'sarvam' | 'deepgram' | 'passthrough';

export interface AsrConfig {
    provider: AsrProvider;
    language: SupportedLanguage;
    sampleRate: number;          // 16000
    channels: number;           // 1 (mono)
    encoding: 'pcm_s16le' | 'mulaw';
    interimResults: boolean;
    endpointingMs: number;      // silence ms before a final is forced
    vadEnabled: boolean;
}

// ── Language → provider code mapping ───────────────────────────────

const SARVAM_LANG: Record<SupportedLanguage, string> = {
    hindi: 'hi-IN',
    english: 'en-IN',
    hinglish: 'hi-IN',
    tamil: 'ta-IN',
    telugu: 'te-IN',
    kannada: 'kn-IN',
    marathi: 'mr-IN',
    bengali: 'bn-IN',
    gujarati: 'gu-IN',
    punjabi: 'pa-IN',
    malayalam: 'ml-IN',
    odia: 'or-IN',
    unknown: 'en-IN',
};

const DEEPGRAM_LANG: Record<SupportedLanguage, string> = {
    hindi: 'hi',
    english: 'en-IN',
    hinglish: 'hi',
    tamil: 'ta',
    telugu: 'te',
    kannada: 'kn',
    marathi: 'mr',
    bengali: 'bn',
    gujarati: 'gu',
    punjabi: 'pa',
    malayalam: 'ml',
    odia: 'or',
    unknown: 'en-IN',
};

// ── ASRProvider ─────────────────────────────────────────────────────

export class ASRProvider {
    private config: AsrConfig;
    private callbacks: TranscriptCallback[] = [];
    private isRunning = true;
    private socket: WebSocket | null = null;
    private isConnecting = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelayMs = 500;
    private reconnectTimer: NodeJS.Timeout | null = null;

    // Passthrough / fallback state
    private passthroughBuffer: Buffer[] = [];
    private passthroughFinalTimer: NodeJS.Timeout | null = null;
    private passthroughInterimText = '';

    // Metrics
    private framesReceived = 0;
    private bytesReceived = 0;
    private lastFinalAt = 0;

    constructor(language: SupportedLanguage = 'hinglish', partial?: Partial<AsrConfig>) {
        const provider: AsrProvider =
            (process.env.ASR_PROVIDER as AsrProvider) ||
            (process.env.SARVAM_API_KEY ? 'sarvam' : process.env.DEEPGRAM_API_KEY ? 'deepgram' : 'passthrough');

        this.config = {
            provider,
            language,
            sampleRate: 16000,
            channels: 1,
            encoding: 'pcm_s16le',
            interimResults: true,
            endpointingMs: 700,
            vadEnabled: true,
            ...partial,
        };

        logger.info(`[ASRProvider] Initialized provider=${provider} lang=${language} sampleRate=${this.config.sampleRate}`);

        // Connect eagerly so the first audio frame has a warm socket.
        this.connect().catch((err) => {
            logger.warn(`[ASRProvider] Initial connect failed, will retry on feed: ${err.message}`);
        });
    }

    // ── Public API ───────────────────────────────────────────────────

    onTranscript(callback: TranscriptCallback): void {
        this.callbacks.push(callback);
    }

    getConfig(): AsrConfig {
        return { ...this.config };
    }

    /**
     * Feed raw PCM audio into the ASR pipeline.
     * Frames are forwarded to the active provider socket immediately (no buffering)
     * to keep first-token latency minimal.
     */
    feedAudio(audioChunk: Buffer): void {
        if (!this.isRunning || audioChunk.length === 0) return;

        this.framesReceived++;
        this.bytesReceived += audioChunk.length;

        if (this.config.provider === 'passthrough') {
            this.feedPassthrough(audioChunk);
            return;
        }

        // Ensure socket is open; if not, buffer briefly and (re)connect.
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.passthroughBuffer.push(audioChunk);
            if (this.socket === null) this.connect().catch(() => { });
            return;
        }

        try {
            if (this.config.provider === 'sarvam') {
                const base64Data = audioChunk.toString('base64');
                const audioMsg = {
                    type: 'audio',
                    audio: {
                        data: base64Data,
                        encoding: 'audio/wav',
                        sample_rate: this.config.sampleRate || 16000,
                    },
                };
                this.socket.send(JSON.stringify(audioMsg));
            } else {
                this.socket.send(audioChunk);
            }
        } catch (err: any) {
            logger.warn(`[ASRProvider] send failed: ${err.message}`);
            this.scheduleReconnect();
        }
    }

    /**
     * Emit a transcript to all registered callbacks.
     * Called internally when the provider returns a result.
     */
    emitTranscript(transcript: string, isFinal: boolean, confidence?: number): void {
        const text = transcript.trim();
        if (!text && !isFinal) return;
        for (const cb of this.callbacks) {
            try {
                cb(text, isFinal, confidence);
            } catch (err: any) {
                logger.error(`[ASRProvider] Callback error: ${err.message}`);
            }
        }
        if (isFinal) this.lastFinalAt = Date.now();
    }

    setLanguage(language: SupportedLanguage): void {
        if (language === this.config.language) return;
        this.config.language = language;
        logger.info(`[ASRProvider] Language switched to: ${language}`);
        // Re-establish the provider socket with the new language config.
        this.teardownSocket();
        this.connect().catch((err) => {
            logger.warn(`[ASRProvider] Reconnect after language switch failed: ${err.message}`);
        });
    }

    stop(): void {
        this.isRunning = false;
        this.teardownSocket();
        if (this.passthroughFinalTimer) {
            clearTimeout(this.passthroughFinalTimer);
            this.passthroughFinalTimer = null;
        }
        this.passthroughBuffer = [];
        this.callbacks = [];
        logger.info(`[ASRProvider] Stopped (frames=${this.framesReceived} bytes=${this.bytesReceived})`);
    }

    getMetrics() {
        return {
            provider: this.config.provider,
            framesReceived: this.framesReceived,
            bytesReceived: this.bytesReceived,
            connected: this.socket?.readyState === WebSocket.OPEN,
            lastFinalAt: this.lastFinalAt,
        };
    }

    // ── Provider connection ─────────────────────────────────────────

    private async connect(): Promise<void> {
        if (this.config.provider === 'passthrough') return;
        if (this.isConnecting) return;
        if (this.socket !== null) {
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                return;
            }
            this.teardownSocket();
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.isConnecting = true;

        const url = this.buildProviderUrl();
        if (!url) {
            this.isConnecting = false;
            return;
        }

        return new Promise<void>((resolve, reject) => {
            try {
                const socket = new WebSocket(url, this.buildProviderOptions());
                this.socket = socket;

                socket.on('open', () => {
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    logger.info(`[ASRProvider] Connected to ${this.config.provider} (${url})`);

                    // Send the required initial config frame for Sarvam
                    if (this.config.provider === 'sarvam') {
                        const configMsg = {
                            type: 'config',
                            data: {
                                model: 'saaras:v3',
                                mode: 'transcribe',
                                language_code: SARVAM_LANG[this.config.language] || 'hi-IN',
                                sampling_rate: this.config.sampleRate || 16000
                            }
                        };
                        socket.send(JSON.stringify(configMsg));
                        logger.info(`[ASRProvider] Sent Sarvam config: ${JSON.stringify(configMsg)}`);
                    }

                    // Flush any buffered frames from before the socket opened.
                    if (this.passthroughBuffer.length) {
                        for (const buf of this.passthroughBuffer) {
                            if (socket.readyState === WebSocket.OPEN) {
                                if (this.config.provider === 'sarvam') {
                                    const base64Data = buf.toString('base64');
                                    const audioMsg = {
                                        type: 'audio',
                                        audio: {
                                            data: base64Data,
                                            encoding: 'audio/wav',
                                            sample_rate: this.config.sampleRate || 16000,
                                        },
                                    };
                                    socket.send(JSON.stringify(audioMsg));
                                } else {
                                    socket.send(buf);
                                }
                            }
                        }
                        this.passthroughBuffer = [];
                    }
                    resolve();
                });

                socket.on('message', (data: Buffer) => this.handleProviderMessage(data));

                socket.on('error', (err) => {
                    logger.warn(`[ASRProvider] socket error: ${err.message}`);
                    if (!this.reconnectAttempts) reject(err);
                });

                socket.on('close', (code, reason) => {
                    this.isConnecting = false;
                    logger.info(`[ASRProvider] socket closed: code=${code} reason=${reason.toString()}`);
                    this.socket = null;
                    if (this.isRunning) this.scheduleReconnect();
                });
            } catch (err: any) {
                this.isConnecting = false;
                reject(err);
            }
        });
    }

    private buildProviderUrl(): string | null {
        if (this.config.provider === 'sarvam') {
            const key = process.env.SARVAM_API_KEY;
            if (!key) {
                logger.warn('[ASRProvider] SARVAM_API_KEY missing — falling back to passthrough');
                this.config.provider = 'passthrough';
                return null;
            }
            const lang = SARVAM_LANG[this.config.language] || 'en-IN';
            const base = process.env.SARVAM_ASR_URL || 'wss://api.sarvam.ai/speech-to-text/ws';
            return `${base}?language-code=${lang}&model=saaras:v3`;
        }

        if (this.config.provider === 'deepgram') {
            const key = process.env.DEEPGRAM_API_KEY;
            if (!key) {
                logger.warn('[ASRProvider] DEEPGRAM_API_KEY missing — falling back to passthrough');
                this.config.provider = 'passthrough';
                return null;
            }
            const lang = DEEPGRAM_LANG[this.config.language] || 'en-IN';
            const base = process.env.DEEPGRAM_ASR_URL || 'wss://api.deepgram.com/v1/listen';
            const params = new URLSearchParams({
                model: 'nova-2-conversational',
                language: lang,
                interim_results: String(this.config.interimResults),
                endpointing: String(this.config.endpointingMs),
                vad_events: String(this.config.vadEnabled),
                encoding: 'linear16',
                sample_rate: String(this.config.sampleRate),
                channels: String(this.config.channels),
            });
            return `${base}?${params.toString()}`;
        }

        return null;
    }

    private buildProviderOptions(): { headers: Record<string, string> } | undefined {
        if (this.config.provider === 'sarvam') {
            return { headers: { 'api-subscription-key': process.env.SARVAM_API_KEY || '' } };
        }
        if (this.config.provider === 'deepgram') {
            return { headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` } };
        }
        return undefined;
    }

    private handleProviderMessage(data: Buffer): void {
        try {
            const msg = JSON.parse(data.toString());
            if (this.config.provider === 'deepgram') {
                this.handleDeepgramMessage(msg);
            } else if (this.config.provider === 'sarvam') {
                this.handleSarvamMessage(msg);
            }
        } catch (err: any) {
            logger.warn(`[ASRProvider] Failed to parse provider message: ${err.message}`);
        }
    }

    // Deepgram: { type: 'Results', channel: { alternatives: [{ transcript, confidence }], is_final } }
    private handleDeepgramMessage(msg: any): void {
        if (msg.type !== 'Results' || !msg.channel) return;
        const alt = msg.channel.alternatives?.[0];
        if (!alt) return;
        const isFinal = Boolean(msg.channel.is_final);
        this.emitTranscript(alt.transcript || '', isFinal, alt.confidence);
    }

    // Sarvam: { type: 'transcript'|'final', transcript, is_final, confidence }
    private handleSarvamMessage(msg: any): void {
        let transcript = '';
        let isFinal = false;

        // Support nested structure (msg.data.transcript) or flat structure (msg.transcript)
        if (msg.data) {
            transcript = msg.data.transcript || msg.data.text || '';
            isFinal = Boolean(msg.data.is_final ?? msg.data.final ?? (msg.type === 'final' || msg.data.type === 'final'));
        } else {
            transcript = msg.transcript || msg.text || '';
            isFinal = Boolean(msg.is_final ?? msg.final ?? (msg.type === 'final'));
        }

        const confidence = typeof msg.confidence === 'number'
            ? msg.confidence
            : (msg.data && typeof msg.data.confidence === 'number' ? msg.data.confidence : undefined);

        this.emitTranscript(transcript, isFinal, confidence);
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.warn(`[ASRProvider] Max reconnect attempts reached — switching to passthrough`);
            this.config.provider = 'passthrough';
            this.socket = null;
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.isRunning) return;
            this.connect().catch(() => { });
        }, delay);
    }

    private teardownSocket(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            try {
                this.socket.removeAllListeners();
                this.socket.on('error', () => { /* ignore post-teardown errors */ });
                if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
            } catch {
                /* ignore */
            }
            this.socket = null;
        }
    }

    // ── Passthrough fallback (no provider configured) ───────────────
    // Emits a synthetic final after a short silence so the cognitive loop
    // still receives a turn. Useful for local dev / integration tests.

    private feedPassthrough(audioChunk: Buffer): void {
        // We cannot truly transcribe without a provider; emit a placeholder
        // final only when energy is non-trivial, so tests can drive the loop.
        const energy = this.rmsEnergy(audioChunk);
        if (energy > 0.01) {
            this.passthroughInterimText = '[audio detected]';
            this.emitTranscript(this.passthroughInterimText, false, 0.5);
            if (this.passthroughFinalTimer) clearTimeout(this.passthroughFinalTimer);
            this.passthroughFinalTimer = setTimeout(() => {
                if (this.passthroughInterimText) {
                    this.emitTranscript(this.passthroughInterimText, true, 0.5);
                    this.passthroughInterimText = '';
                }
            }, this.config.endpointingMs);
        }
    }

    private rmsEnergy(buffer: Buffer): number {
        if (buffer.length < 2) return 0;
        let sum = 0;
        const n = Math.floor(buffer.length / 2);
        for (let i = 0; i < buffer.length - 1; i += 2) {
            const s = buffer.readInt16LE(i) / 32768;
            sum += s * s;
        }
        return Math.sqrt(sum / Math.max(1, n));
    }
}

export default ASRProvider;
