/**
 * TTSProvider — Ultra-Low Latency Streaming Text-to-Speech
 *
 * Converts Rohan's text responses into audio and streams them back to the
 * caller over the WebSocket connection in small chunks for minimal
 * first-byte latency.
 *
 * Design goals:
 *   - First audio byte < 250ms (stream chunks as they arrive from provider)
 *   - Sentence-level streaming: split text into clauses and synthesize each
 *     in parallel, sending audio as soon as the first clause is ready.
 *   - Barge-in abort: stop() cancels in-flight synthesis and flushes the
 *     outbound audio queue immediately.
 *   - Provider-agnostic: Sarvam AI (primary) or Deepgram/ ElevenLabs-style
 *     HTTP streaming fallback. Falls back to a silent PCM generator when no
 *     provider is configured (local dev).
 *
 * Audio contract:
 *   - 16-bit PCM, 16 kHz, mono, little-endian (matches ASR input contract).
 */

import { WebSocket } from 'ws';
import { logger } from '@zentrix/logger';
import { SupportedLanguage } from '@zentrix/types';

// ── Types ───────────────────────────────────────────────────────────

export type TtsProvider = 'sarvam' | 'deepgram' | 'passthrough';

export interface TtsParams {
    speed: number;
    pitch: number;
}

export interface TtsStreamResult {
    bytesStreamed: number;
    chunksSent: number;
    durationMs: number;
    aborted: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

const SARVAM_VOICE_LANG: Record<SupportedLanguage, string> = {
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

/**
 * Split text into clause-sized chunks for parallel/streamed synthesis.
 * Splits on sentence terminators and commas, keeping a max chunk length.
 */
function splitIntoClauses(text: string, maxLen = 120): string[] {
    const cleaned = text.trim();
    if (!cleaned) return [];
    // Split on . ! ? । (Devanagari danda) , ; — while preserving them.
    const parts = cleaned.split(/(?<=[.!?।,;])\s+/).filter(Boolean);
    const clauses: string[] = [];
    let buf = '';
    for (const p of parts) {
        if ((buf + ' ' + p).trim().length > maxLen && buf) {
            clauses.push(buf.trim());
            buf = p;
        } else {
            buf = buf ? `${buf} ${p}` : p;
        }
    }
    if (buf.trim()) clauses.push(buf.trim());
    return clauses.length ? clauses : [cleaned];
}

// ── TTSProvider ─────────────────────────────────────────────────────

export class TTSProvider {
    private isPlaying = false;
    private abortController: AbortController | null = null;
    private provider: TtsProvider;
    private chunkSizeBytes: number;

    constructor() {
        this.provider =
            (process.env.TTS_PROVIDER as TtsProvider) ||
            (process.env.SARVAM_API_KEY ? 'sarvam' : process.env.DEEPGRAM_API_KEY ? 'deepgram' : 'passthrough');
        // ~100ms of 16kHz mono 16-bit audio = 3200 bytes
        this.chunkSizeBytes = parseInt(process.env.TTS_CHUNK_BYTES || '3200', 10);
        logger.info(`[TTSProvider] Initialized provider=${this.provider} chunkBytes=${this.chunkSizeBytes}`);
    }

    // ── Public API ──────────────────────────────────────────────────

    get isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Synthesize text to audio and stream chunks over WebSocket.
     * Splits the text into clauses and streams each as soon as it is ready,
     * minimizing time-to-first-audio-byte.
     */
    async synthesizeAndStream(
        text: string,
        voiceId: string,
        params: TtsParams,
        ws: WebSocket,
        language: SupportedLanguage = 'hinglish'
    ): Promise<TtsStreamResult> {
        const startedAt = Date.now();
        const result: TtsStreamResult = { bytesStreamed: 0, chunksSent: 0, durationMs: 0, aborted: false };

        if (ws.readyState !== WebSocket.OPEN) {
            logger.warn('[TTSProvider] WebSocket not open — skipping TTS');
            return result;
        }
        if (!text || !text.trim()) return result;

        this.isPlaying = true;
        this.abortController = new AbortController();

        try {
            const clauses = splitIntoClauses(text);
            // Synthesize clauses sequentially to preserve order, but stream
            // each clause's audio in chunks as it arrives.
            for (const clause of clauses) {
                if (!this.isPlaying || this.abortController.signal.aborted) {
                    result.aborted = true;
                    break;
                }
                const chunkResult = await this.synthesizeClause(clause, voiceId, params, ws, language);
                result.bytesStreamed += chunkResult.bytesStreamed;
                result.chunksSent += chunkResult.chunksSent;
            }

            logger.info(
                `[TTSProvider] Streamed "${text.substring(0, 50)}..." bytes=${result.bytesStreamed} ` +
                `chunks=${result.chunksSent} clauses=${clauses.length} voice=${voiceId}`
            );
        } catch (err: any) {
            if (err.name === 'AbortError' || this.abortController?.signal.aborted) {
                result.aborted = true;
                logger.info('[TTSProvider] TTS aborted (barge-in)');
            } else {
                logger.error(`[TTSProvider] Synthesis failed: ${err.message}`);
            }
        } finally {
            this.isPlaying = false;
            this.abortController = null;
            result.durationMs = Date.now() - startedAt;
        }

        return result;
    }

    /**
     * Stop current TTS playback immediately (barge-in support).
     * Aborts in-flight HTTP fetches and signals the streaming loop to exit.
     */
    stop(): void {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        logger.info('[TTSProvider] Playback stopped (barge-in)');
    }

    /**
     * Synthesize text to an in-memory PCM audio buffer.
     * Useful for caching common responses like filler words.
     */
    async synthesizeToBuffer(
        text: string,
        voiceId: string,
        params: TtsParams,
        language: SupportedLanguage = 'hinglish'
    ): Promise<Buffer> {
        if (!text || !text.trim()) {
            return Buffer.alloc(0);
        }

        if (this.provider === 'passthrough') {
            return this.generateSilentPcm(Math.ceil(text.length * 60));
        }

        const url = this.buildTtsUrl(language);
        const headers = this.buildTtsHeaders();
        const body = this.buildTtsBody(text, voiceId, params, language);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            throw new Error(`TTS HTTP ${response.status}: ${errText.substring(0, 200)}`);
        }

        if (this.provider === 'sarvam') {
            const json = await response.json() as any;
            if (!json.audios || json.audios.length === 0) {
                throw new Error("Sarvam TTS returned empty audio list");
            }
            const wavBuf = Buffer.from(json.audios[0], 'base64');
            let dataOffset = 44;
            if (wavBuf.length > 44 && wavBuf.subarray(0, 4).toString() === 'RIFF') {
                let offset = 12;
                while (offset < wavBuf.length - 8) {
                    const chunkId = wavBuf.subarray(offset, offset + 4).toString();
                    const chunkSize = wavBuf.readUInt32LE(offset + 4);
                    if (chunkId === 'data') {
                        dataOffset = offset + 8;
                        break;
                    }
                    offset += 8 + chunkSize;
                }
            }
            return wavBuf.subarray(dataOffset);
        }

        // Generic stream response builder
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }
        return Buffer.concat(chunks);
    }

    /**
     * Stream an existing PCM audio buffer in chunks over WebSocket.
     */
    async streamBuffer(
        buffer: Buffer,
        ws: WebSocket
    ): Promise<TtsStreamResult> {
        const startedAt = Date.now();
        const result: TtsStreamResult = { bytesStreamed: 0, chunksSent: 0, durationMs: 0, aborted: false };

        if (ws.readyState !== WebSocket.OPEN) {
            logger.warn('[TTSProvider] WebSocket not open — skipping buffer stream');
            return result;
        }
        if (!buffer || buffer.length === 0) return result;

        this.isPlaying = true;
        this.abortController = new AbortController();

        try {
            for (const chunk of this.chunkBuffer(buffer)) {
                if (!this.isPlaying || this.abortController?.signal.aborted) {
                    result.aborted = true;
                    break;
                }
                ws.send(chunk);
                result.bytesStreamed += chunk.length;
                result.chunksSent++;
                await this.backpressureYield();
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || this.abortController?.signal.aborted) {
                result.aborted = true;
                logger.info('[TTSProvider] TTS buffer stream aborted (barge-in)');
            } else {
                logger.error(`[TTSProvider] Buffer stream failed: ${err.message}`);
            }
        } finally {
            this.isPlaying = false;
            this.abortController = null;
            result.durationMs = Date.now() - startedAt;
        }

        return result;
    }

    // ── Per-clause synthesis ────────────────────────────────────────

    private async synthesizeClause(
        clause: string,
        voiceId: string,
        params: TtsParams,
        ws: WebSocket,
        language: SupportedLanguage
    ): Promise<{ bytesStreamed: number; chunksSent: number }> {
        let bytesStreamed = 0;
        let chunksSent = 0;

        if (this.provider === 'passthrough') {
            // Generate a short silent PCM buffer so the pipeline still emits
            // audio frames in local dev (no provider configured).
            const silent = this.generateSilentPcm(Math.ceil(clause.length * 60)); // ~60ms per char
            for (const chunk of this.chunkBuffer(silent)) {
                if (!this.isPlaying || this.abortController?.signal.aborted) break;
                if (ws.readyState !== WebSocket.OPEN) break;
                ws.send(chunk);
                bytesStreamed += chunk.length;
                chunksSent++;
                await this.backpressureYield();
            }
            return { bytesStreamed, chunksSent };
        }

        // Provider HTTP streaming synthesis
        const url = this.buildTtsUrl(language);
        const headers = this.buildTtsHeaders();
        const body = this.buildTtsBody(clause, voiceId, params, language);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: this.abortController!.signal,
        });

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            throw new Error(`TTS HTTP ${response.status}: ${errText.substring(0, 200)}`);
        }

        if (this.provider === 'sarvam') {
            const json = await response.json() as any;
            if (!json.audios || json.audios.length === 0) {
                throw new Error("Sarvam TTS returned empty audio list");
            }
            const wavBuf = Buffer.from(json.audios[0], 'base64');
            if (wavBuf.length >= 28) {
                const sampleRate = wavBuf.readUInt32LE(24);
                logger.info(`[TTSProvider] Sarvam WAV Header Sample Rate: ${sampleRate} Hz`);
            }
            let dataOffset = 44;
            if (wavBuf.length > 44 && wavBuf.subarray(0, 4).toString() === 'RIFF') {
                let offset = 12;
                while (offset < wavBuf.length - 8) {
                    const chunkId = wavBuf.subarray(offset, offset + 4).toString();
                    const chunkSize = wavBuf.readUInt32LE(offset + 4);
                    if (chunkId === 'data') {
                        dataOffset = offset + 8;
                        break;
                    }
                    offset += 8 + chunkSize;
                }
            }
            const pcm = wavBuf.subarray(dataOffset);

            for (const chunk of this.chunkBuffer(pcm)) {
                if (!this.isPlaying || this.abortController?.signal.aborted) break;
                if (ws.readyState !== WebSocket.OPEN) break;
                ws.send(chunk);
                bytesStreamed += chunk.length;
                chunksSent++;
                await this.backpressureYield();
            }
            return { bytesStreamed, chunksSent };
        }

        // Stream the response body in fixed-size chunks for steady playback.
        const reader = response.body.getReader();
        try {
            let pending = Buffer.alloc(0);
            // Time-to-first-byte tracking
            let firstByteSent = false;
            const ttfbStart = Date.now();

            while (this.isPlaying && !this.abortController?.signal.aborted) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!firstByteSent) {
                    logger.debug(`[TTSProvider] TTFB ${Date.now() - ttfbStart}ms`);
                    firstByteSent = true;
                }
                pending = Buffer.concat([pending, Buffer.from(value)]);
                while (pending.length >= this.chunkSizeBytes) {
                    const chunk = pending.subarray(0, this.chunkSizeBytes);
                    pending = pending.subarray(this.chunkSizeBytes);
                    if (ws.readyState !== WebSocket.OPEN) {
                        this.isPlaying = false;
                        break;
                    }
                    ws.send(chunk);
                    bytesStreamed += chunk.length;
                    chunksSent++;
                    await this.backpressureYield();
                }
            }
            // Flush remainder
            if (pending.length && this.isPlaying && ws.readyState === WebSocket.OPEN) {
                ws.send(pending);
                bytesStreamed += pending.length;
                chunksSent++;
            }
        } finally {
            reader.releaseLock();
        }

        return { bytesStreamed, chunksSent };
    }

    // ── Provider request builders ───────────────────────────────────

    private buildTtsUrl(language: SupportedLanguage): string {
        if (this.provider === 'sarvam') {
            return process.env.SARVAM_TTS_URL || 'https://api.sarvam.ai/text-to-speech';
        }
        // Deepgram does not host TTS over HTTP streaming the same way; use a
        // configurable endpoint so ops can point to ElevenLabs/Azure etc.
        return process.env.TTS_STREAM_URL || 'https://api.deepgram.com/v1/speak';
    }

    private buildTtsHeaders(): Record<string, string> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.provider === 'sarvam') {
            headers['api-subscription-key'] = process.env.SARVAM_API_KEY || '';
            headers['Accept'] = 'application/json';
        } else if (this.provider === 'deepgram') {
            headers['Authorization'] = `Token ${process.env.DEEPGRAM_API_KEY}`;
        }
        return headers;
    }

    private buildTtsBody(
        text: string,
        voiceId: string,
        params: TtsParams,
        language: SupportedLanguage
    ): Record<string, unknown> {
        if (this.provider === 'sarvam') {
            const model = process.env.SARVAM_TTS_MODEL || 'bulbul:v3';
            if (model === 'bulbul:v3') {
                return {
                    inputs: [text],
                    speaker: voiceId,
                    speech_rate: params.speed || 1.0,
                    enable_preprocessing: true,
                    model: 'bulbul:v3',
                    target_language_code: SARVAM_VOICE_LANG[language] || 'hi-IN',
                    speech_sample_rate: 16000,
                };
            }
            return {
                inputs: [text],
                target_speaker: voiceId,
                pitch: params.pitch,
                pace: params.speed,
                loudness: 1.0,
                speech_sample_rate: 16000,
                enable_smoothing: true,
                model: 'bulbul:v2',
                language_code: SARVAM_VOICE_LANG[language] || 'en-IN',
            };
        }
        // Generic fallback body (Deepgram/ElevenLabs-style)
        return {
            text,
            voice: voiceId,
            speed: params.speed,
            pitch: params.pitch,
            sample_rate: 16000,
            encoding: 'linear16',
            stream: true,
        };
    }

    // ── Utilities ──────────────────────────────────────────────────

    private *chunkBuffer(buf: Buffer): Generator<Buffer> {
        for (let i = 0; i < buf.length; i += this.chunkSizeBytes) {
            yield buf.subarray(i, Math.min(i + this.chunkSizeBytes, buf.length));
        }
    }

    private generateSilentPcm(durationMs: number): Buffer {
        const samples = Math.floor((16000 * durationMs) / 1000);
        const buf = Buffer.alloc(samples * 2);
        const freq = 350;
        for (let i = 0; i < samples; i++) {
            const t = i / 16000;
            // Modulate the amplitude to simulate words/gaps so it sounds like mock speech
            const ampEnvelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.5 * t);
            const val = Math.round(8000 * Math.sin(2 * Math.PI * freq * t) * ampEnvelope);
            buf.writeInt16LE(val, i * 2);
        }
        return buf;
    }

    /**
     * Yield to the event loop between chunks so the WebSocket can drain and
     * we don't saturate the outbound buffer (backpressure).
     */
    private backpressureYield(): Promise<void> {
        return new Promise((r) => setImmediate(r));
    }
}

export default TTSProvider;
