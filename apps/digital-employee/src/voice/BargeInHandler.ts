/**
 * BargeInHandler — Interruption Detection
 *
 * Detects when a caller starts speaking while Rohan is still responding (TTS playing).
 * This triggers an immediate stop of TTS playback so Rohan can listen.
 *
 * Uses simple VAD (Voice Activity Detection) on incoming audio energy levels.
 * Future: Replace with a proper WebRTC VAD or Silero VAD model.
 */

import { logger } from '@zentrix/logger';

// Configurable thresholds
const ENERGY_THRESHOLD = 0.02;       // Minimum RMS energy to consider "speech"
const SPEECH_FRAMES_REQUIRED = 3;    // Consecutive frames above threshold to trigger
const SILENCE_FRAMES_REQUIRED = 10;  // Consecutive frames below threshold to reset

export class BargeInHandler {
    private speechFrameCount = 0;
    private silenceFrameCount = 0;
    private bargeInDetected = false;
    private ttsIsPlaying = false;

    /**
     * Feed raw audio data for VAD analysis.
     * Call this with each incoming audio frame from the caller.
     */
    feedAudio(audioChunk: Buffer): void {
        const energy = this.calculateRMSEnergy(audioChunk);

        if (energy > ENERGY_THRESHOLD) {
            this.speechFrameCount++;
            this.silenceFrameCount = 0;

            // Trigger barge-in if TTS is playing and we detect sustained speech
            if (this.ttsIsPlaying && this.speechFrameCount >= SPEECH_FRAMES_REQUIRED) {
                this.bargeInDetected = true;
                logger.info(`[BargeIn] Detected! Energy: ${energy.toFixed(4)}, frames: ${this.speechFrameCount}`);
            }
        } else {
            this.silenceFrameCount++;
            if (this.silenceFrameCount >= SILENCE_FRAMES_REQUIRED) {
                this.speechFrameCount = 0;
                this.bargeInDetected = false;
            }
        }
    }

    /**
     * Check if a barge-in has been detected.
     */
    isBargeIn(): boolean {
        const result = this.bargeInDetected;
        if (result) {
            this.bargeInDetected = false; // Reset after reading
        }
        return result;
    }

    /**
     * Notify the handler that TTS playback has started.
     */
    setTTSPlaying(playing: boolean): void {
        this.ttsIsPlaying = playing;
        if (!playing) {
            this.bargeInDetected = false;
            this.speechFrameCount = 0;
        }
    }

    /**
     * Calculate RMS (Root Mean Square) energy of a 16-bit PCM audio buffer.
     * This is a simple measure of "loudness" for VAD purposes.
     */
    private calculateRMSEnergy(buffer: Buffer): number {
        if (buffer.length < 2) return 0;

        let sumSquares = 0;
        const sampleCount = Math.floor(buffer.length / 2);

        for (let i = 0; i < buffer.length - 1; i += 2) {
            const sample = buffer.readInt16LE(i) / 32768; // Normalize to [-1, 1]
            sumSquares += sample * sample;
        }

        return Math.sqrt(sumSquares / sampleCount);
    }
}
