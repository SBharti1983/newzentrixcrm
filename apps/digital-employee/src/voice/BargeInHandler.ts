/**
 * BargeInHandler — Interruption Detection with Silero VAD (ONNX)
 *
 * Replaces ZCR and RMS energy heuristics with the highly accurate,
 * noise-resilient Silero VAD v5 ONNX model.
 *
 * Supports:
 *   - Asynchronous real-time frame processing
 *   - Callbacks for immediate turn interruption
 *   - Clean backward-compatible metrics/API
 */

import { logger } from '@zentrix/logger';

export interface VadConfig {
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    redemptionFrames: number;
    sampleRate: number;
}

const DEFAULT_CONFIG: VadConfig = {
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    redemptionFrames: 8,
    sampleRate: 8000, // Zoiper defaults to 8kHz linear PCM
};

export class BargeInHandler {
    private config: VadConfig;
    private vad: any = null;
    private initPromise: Promise<void> | null = null;
    private onBargeInCallback?: () => void;

    // States
    private ttsIsPlaying = false;
    private isSpeakingState = false;
    private bargeInDetected = false;

    // Metrics (for dashboard compatibility)
    private totalFrames = 0;
    private speechFrames = 0;
    private bargeInCount = 0;

    constructor(config: Partial<VadConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        logger.info(
            `[BargeIn] Initialized Silero VAD: posThr=${this.config.positiveSpeechThreshold} ` +
            `negThr=${this.config.negativeSpeechThreshold} sampleRate=${this.config.sampleRate}`
        );
    }

    /**
     * Lazily imports and instantiates the avr-vad RealTimeVAD.
     * Prevents process startup delay until the first audio frame arrives.
     */
    private async initVad(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = (async () => {
            try {
                const { RealTimeVAD } = await import('avr-vad');
                this.vad = await RealTimeVAD.new({
                    model: 'v5',
                    positiveSpeechThreshold: this.config.positiveSpeechThreshold,
                    negativeSpeechThreshold: this.config.negativeSpeechThreshold,
                    redemptionFrames: this.config.redemptionFrames,
                    sampleRate: this.config.sampleRate,
                    onSpeechStart: () => {
                        this.isSpeakingState = true;
                        if (this.ttsIsPlaying) {
                            this.bargeInDetected = true;
                            this.bargeInCount++;
                            logger.info('[BargeIn] Interruption detected via Silero VAD.');
                            if (this.onBargeInCallback) {
                                this.onBargeInCallback();
                            }
                        }
                    },
                    onSpeechEnd: () => {
                        this.isSpeakingState = false;
                        this.bargeInDetected = false;
                    },
                    // Disable CUDA/GPU warning noise by not providing custom providers
                });
                logger.info('[BargeIn] Silero VAD model loaded successfully.');
            } catch (err: any) {
                logger.error(`[BargeIn] Failed to load Silero VAD model: ${err.message}`);
                throw err;
            }
        })();
        return this.initPromise;
    }

    /**
     * Register a callback to trigger immediately on speech activity when TTS is active.
     */
    setOnBargeIn(callback: () => void): void {
        this.onBargeInCallback = callback;
    }

    /**
     * Feed raw 16-bit PCM audio for VAD analysis.
     * Processes Float32 samples asynchronously.
     */
    feedAudio(audioChunk: Buffer): void {
        if (audioChunk.length < 2) return;
        this.totalFrames++;

        // Convert 16-bit linear PCM buffer to Float32Array normalized between [-1.0, 1.0]
        const sampleCount = Math.floor(audioChunk.length / 2);
        const float32Samples = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            const sample16 = audioChunk.readInt16LE(i * 2);
            float32Samples[i] = sample16 / 32768.0;
        }

        // Fire-and-forget async execution
        this.processAudioAsync(float32Samples);
    }

    private async processAudioAsync(float32Samples: Float32Array): Promise<void> {
        try {
            if (!this.vad) {
                await this.initVad();
            }
            if (this.vad) {
                await this.vad.processAudio(float32Samples);
                if (this.isSpeakingState) {
                    this.speechFrames++;
                }
            }
        } catch (err: any) {
            logger.error(`[BargeIn] VAD process audio error: ${err.message}`);
        }
    }

    /**
     * Check if a barge-in has been detected (edge-triggered: resets after read).
     */
    isBargeIn(): boolean {
        const result = this.bargeInDetected;
        if (result) this.bargeInDetected = false;
        return result;
    }

    /**
     * Notify the handler that TTS playback has started/stopped.
     */
    setTTSPlaying(playing: boolean): void {
        this.ttsIsPlaying = playing;
        if (!playing) {
            this.bargeInDetected = false;
            if (this.vad) {
                this.vad.reset();
            }
        }
    }

    /**
     * Whether the caller is currently speaking.
     */
    isSpeaking(): boolean {
        return this.isSpeakingState;
    }

    getMetrics() {
        return {
            totalFrames: this.totalFrames,
            speechFrames: this.speechFrames,
            speechRatio: this.totalFrames ? this.speechFrames / this.totalFrames : 0,
            bargeInCount: this.bargeInCount,
            noiseFloor: 0.0,
            ttsPlaying: this.ttsIsPlaying,
        };
    }

    /**
     * Cleanup native resources.
     */
    async destroy(): Promise<void> {
        if (this.vad) {
            await this.vad.destroy();
            this.vad = null;
        }
    }
}

export default BargeInHandler;
