/**
 * ASRProvider — Streaming Speech-to-Text
 *
 * Connects to Sarvam AI (or Deepgram) for real-time audio transcription.
 * Emits interim and final transcripts as audio frames arrive.
 *
 * Future: Swap providers without changing the VoiceAdapter interface.
 */

import { logger } from '@zentrix/logger';
import { SupportedLanguage } from '@zentrix/types';

type TranscriptCallback = (transcript: string, isFinal: boolean) => void;

export class ASRProvider {
    private language: SupportedLanguage;
    private callbacks: TranscriptCallback[] = [];
    private audioBuffer: Buffer[] = [];
    private isRunning = true;

    constructor(language: SupportedLanguage = 'hinglish') {
        this.language = language;
        logger.info(`[ASRProvider] Initialized for language: ${language}`);
    }

    /**
     * Register a callback for transcript events.
     */
    onTranscript(callback: TranscriptCallback): void {
        this.callbacks.push(callback);
    }

    /**
     * Feed raw audio data into the ASR pipeline.
     * In production, this streams to Sarvam AI or Deepgram WebSocket.
     */
    feedAudio(audioChunk: Buffer): void {
        if (!this.isRunning) return;
        this.audioBuffer.push(audioChunk);

        // TODO: Stream audioChunk to Sarvam AI streaming ASR endpoint
        // The Sarvam SDK will call back with interim/final transcripts
        // which we then emit via this.emitTranscript()
    }

    /**
     * Emit a transcript to all registered callbacks.
     * Called by the ASR provider when it produces a result.
     */
    emitTranscript(transcript: string, isFinal: boolean): void {
        for (const cb of this.callbacks) {
            try {
                cb(transcript, isFinal);
            } catch (err: any) {
                logger.error(`[ASRProvider] Callback error: ${err.message}`);
            }
        }
    }

    /**
     * Change the ASR language mid-conversation (e.g., after language detection).
     */
    setLanguage(language: SupportedLanguage): void {
        this.language = language;
        logger.info(`[ASRProvider] Language switched to: ${language}`);
        // TODO: Reinitialize Sarvam connection with new language config
    }

    /**
     * Stop the ASR provider and release resources.
     */
    stop(): void {
        this.isRunning = false;
        this.audioBuffer = [];
        this.callbacks = [];
        logger.info('[ASRProvider] Stopped');
    }
}
