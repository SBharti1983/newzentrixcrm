import { logger } from '@zentrix/logger';
import { WebSocket } from 'ws';
import { TTSProvider, TtsParams } from './TTSProvider';
import { SupportedLanguage } from '@zentrix/types';

export class SentenceQueue {
    private queue: string[] = [];
    private isProcessing = false;
    private tts: TTSProvider;
    private ws: WebSocket;
    private voiceId: string;
    private params: TtsParams;
    private language: SupportedLanguage;
    private onPlayStateChange?: (isPlaying: boolean) => void;

    constructor(
        tts: TTSProvider,
        ws: WebSocket,
        voiceId: string,
        params: TtsParams,
        language: SupportedLanguage,
        onPlayStateChange?: (isPlaying: boolean) => void
    ) {
        this.tts = tts;
        this.ws = ws;
        this.voiceId = voiceId;
        this.params = params;
        this.language = language;
        this.onPlayStateChange = onPlayStateChange;
    }

    /**
     * Push a new sentence/text segment to the queue.
     * Automatically triggers processing if not already running.
     */
    push(text: string): void {
        const cleaned = text.trim();
        if (!cleaned) return;
        this.queue.push(cleaned);
        logger.info(`[SentenceQueue] Pushed sentence: "${cleaned.substring(0, 40)}..." (Queue length: ${this.queue.length})`);
        this.processNext();
    }

    /**
     * Clear the queue and abort any ongoing TTS playback (on barge-in).
     */
    clear(): void {
        logger.info(`[SentenceQueue] Clearing queue (remaining: ${this.queue.length})`);
        this.queue = [];
        this.tts.stop();
        this.isProcessing = false;
        this.onPlayStateChange?.(false);
    }

    /**
     * Retrieve the current count of items in the queue.
     */
    get size(): number {
        return this.queue.length;
    }

    /**
     * Internal: Process the next sentence in the queue.
     */
    private async processNext(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        this.onPlayStateChange?.(true);

        try {
            while (this.queue.length > 0) {
                const text = this.queue.shift();
                if (!text) continue;

                if (this.ws.readyState !== WebSocket.OPEN) {
                    logger.warn('[SentenceQueue] WebSocket not open — halting queue processing');
                    break;
                }

                logger.info(`[SentenceQueue] Speaking sentence: "${text.substring(0, 40)}..."`);
                await this.tts.synthesizeAndStream(
                    text,
                    this.voiceId,
                    this.params,
                    this.ws,
                    this.language
                );
            }
        } catch (error: any) {
            logger.error(`[SentenceQueue] Error during playback: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.onPlayStateChange?.(false);
        }
    }
}
