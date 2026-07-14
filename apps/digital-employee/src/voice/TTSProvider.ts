/**
 * TTSProvider — Streaming Text-to-Speech
 *
 * Converts Rohan's text responses into audio and streams them
 * back to the caller via the WebSocket connection.
 *
 * Uses Sarvam AI TTS for Indian language support with natural voice.
 * Streams audio in chunks for minimal first-byte latency.
 */

import { WebSocket } from 'ws';
import { logger } from '@zentrix/logger';

export class TTSProvider {
    private isPlaying = false;
    private abortController: AbortController | null = null;

    /**
     * Synthesize text to audio and stream chunks over WebSocket.
     *
     * @param text      - Text to convert to speech
     * @param voiceId   - Sarvam voice ID (e.g., 'arvind' for Hindi male)
     * @param params    - Speed and pitch settings
     * @param ws        - WebSocket connection to stream audio to
     */
    async synthesizeAndStream(
        text: string,
        voiceId: string,
        params: { speed: number; pitch: number },
        ws: WebSocket
    ): Promise<void> {
        if (ws.readyState !== WebSocket.OPEN) {
            logger.warn('[TTSProvider] WebSocket not open — skipping TTS');
            return;
        }

        this.isPlaying = true;
        this.abortController = new AbortController();

        try {
            // TODO: Replace with actual Sarvam AI TTS streaming call
            // Example Sarvam API endpoint: POST https://api.sarvam.ai/text-to-speech
            //
            // const response = await fetch('https://api.sarvam.ai/text-to-speech', {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         text,
            //         voice: voiceId,
            //         speed: params.speed,
            //         pitch: params.pitch,
            //         format: 'pcm_16000',  // Raw PCM for WebSocket streaming
            //     }),
            //     signal: this.abortController.signal,
            // });
            //
            // Stream audio chunks as they arrive:
            // for await (const chunk of response.body) {
            //     if (!this.isPlaying) break;
            //     ws.send(chunk);
            // }

            logger.info(`[TTSProvider] Synthesized: "${text.substring(0, 50)}..." (voice: ${voiceId})`);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                logger.info('[TTSProvider] TTS aborted (barge-in)');
            } else {
                logger.error(`[TTSProvider] Synthesis failed: ${err.message}`);
            }
        } finally {
            this.isPlaying = false;
            this.abortController = null;
        }
    }

    /**
     * Stop current TTS playback immediately (barge-in support).
     */
    stop(): void {
        this.isPlaying = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        logger.info('[TTSProvider] Playback stopped');
    }
}
