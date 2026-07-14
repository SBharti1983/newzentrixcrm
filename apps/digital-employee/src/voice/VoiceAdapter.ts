/**
 * VoiceAdapter — FreeSWITCH / WebRTC WebSocket Bridge
 *
 * Handles bidirectional audio streaming between the telephony provider
 * (FreeSWITCH, Twilio Media Streams, or WebRTC) and the cognitive loop.
 *
 * Audio Flow:
 *   Caller → Telephony → WebSocket → ASRProvider → Text → CognitiveLoop
 *   CognitiveLoop → Text → TTSProvider → Audio → WebSocket → Telephony → Caller
 */

import { WebSocket } from 'ws';
import { logger } from '@zentrix/logger';
import { ASRProvider } from './ASRProvider';
import { TTSProvider } from './TTSProvider';
import { BargeInHandler } from './BargeInHandler';
import rohanCognitiveLoop from '../services/RohanCognitiveLoop';
import rohanPersonaEngine from '../services/RohanPersonaEngine';
import { CognitiveInput, SupportedLanguage } from '@zentrix/types';

export interface VoiceSession {
    sessionId: string;
    tenantId: number;
    personaId: string;
    leadId?: string;
    language: SupportedLanguage;
    ws: WebSocket;
    asr: ASRProvider;
    tts: TTSProvider;
    bargeIn: BargeInHandler;
    isActive: boolean;
}

export class VoiceAdapter {
    private sessions = new Map<string, VoiceSession>();

    /**
     * Handle a new WebSocket connection from a telephony provider.
     */
    async handleConnection(ws: WebSocket, metadata: {
        sessionId: string;
        tenantId: number;
        personaId: string;
        leadId?: string;
        language?: SupportedLanguage;
    }): Promise<void> {
        const { sessionId, tenantId, personaId, leadId, language } = metadata;

        logger.info(`[VoiceAdapter] New voice session: ${sessionId} (tenant: ${tenantId})`);

        const asr = new ASRProvider(language || 'hinglish');
        const tts = new TTSProvider();
        const bargeIn = new BargeInHandler();

        const session: VoiceSession = {
            sessionId,
            tenantId,
            personaId,
            leadId,
            language: language || 'hinglish',
            ws,
            asr,
            tts,
            bargeIn,
            isActive: true,
        };

        this.sessions.set(sessionId, session);

        // Wire up ASR: when transcription is finalized, run the cognitive loop
        asr.onTranscript(async (transcript: string, isFinal: boolean) => {
            if (!isFinal || !session.isActive) return;

            logger.info(`[VoiceAdapter] Final transcript (${sessionId}): "${transcript}"`);

            // Check for barge-in (user interrupted Rohan)
            if (bargeIn.isBargeIn()) {
                tts.stop(); // Stop current TTS playback
                logger.info(`[VoiceAdapter] Barge-in detected — stopping TTS`);
            }

            // Run cognitive loop
            const input: CognitiveInput = {
                tenant_id: tenantId,
                persona_id: personaId,
                lead_id: leadId,
                channel: 'voice',
                user_message: transcript,
                detected_language: session.language,
            };

            try {
                const result = await rohanCognitiveLoop.processCycle(input);

                // Stream TTS response back to caller
                const persona = await rohanPersonaEngine.getPersona(tenantId);
                const voiceId = rohanPersonaEngine.getVoiceForLanguage(persona, result.fast_response.language);
                const ttsParams = rohanPersonaEngine.getTTSParams(persona);

                // If there's a filler prefix, send it first for naturalness
                if (result.fast_response.filler_prefix) {
                    await tts.synthesizeAndStream(
                        result.fast_response.filler_prefix,
                        voiceId,
                        ttsParams,
                        ws
                    );
                }

                // Stream main response
                await tts.synthesizeAndStream(
                    result.fast_response.text,
                    voiceId,
                    ttsParams,
                    ws
                );

                logger.info(`[VoiceAdapter] Response sent (${sessionId}): latency=${result.fast_response.latency_ms}ms`);
            } catch (err: any) {
                logger.error(`[VoiceAdapter] Cognitive loop error (${sessionId}): ${err.message}`);
            }
        });

        // Handle incoming audio frames from telephony
        ws.on('message', (data: Buffer) => {
            if (!session.isActive) return;

            // Feed audio to ASR for transcription
            asr.feedAudio(data);

            // Feed audio to barge-in detector
            bargeIn.feedAudio(data);
        });

        ws.on('close', () => {
            logger.info(`[VoiceAdapter] Session closed: ${sessionId}`);
            this.cleanup(sessionId);
        });

        ws.on('error', (err) => {
            logger.error(`[VoiceAdapter] WebSocket error (${sessionId}): ${err.message}`);
            this.cleanup(sessionId);
        });

        // Send initial greeting
        try {
            const persona = await rohanPersonaEngine.getPersona(tenantId);
            const greeting = rohanPersonaEngine.generateGreeting(
                persona,
                leadId || 'there',
                undefined,
                'voice'
            );
            const voiceId = rohanPersonaEngine.getVoiceForLanguage(persona, session.language);
            const ttsParams = rohanPersonaEngine.getTTSParams(persona);

            await tts.synthesizeAndStream(greeting, voiceId, ttsParams, ws);
            logger.info(`[VoiceAdapter] Greeting sent for session ${sessionId}`);
        } catch (err: any) {
            logger.warn(`[VoiceAdapter] Greeting failed (${sessionId}): ${err.message}`);
        }
    }

    private cleanup(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
            session.asr.stop();
            session.tts.stop();
            this.sessions.delete(sessionId);
        }
    }

    getActiveSessionCount(): number {
        return this.sessions.size;
    }
}

export default new VoiceAdapter();
