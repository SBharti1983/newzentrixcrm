/**
 * RohanVoiceAdapter — Rohan Sales Agent Voice Streaming Pipeline
 *
 * Extends BaseVoiceAdapter with Rohan-specific cognitive loop, persona engine,
 * and greeting generation. All shared streaming infrastructure (ASR → speculative
 * LLM → TTS, barge-in, filler words, metrics, cleanup) lives in the base class.
 *
 * Audio Flow:
 *   Caller → Telephony → WebSocket → ASRProvider → Text → RohanCognitiveLoop
 *   RohanCognitiveLoop → Text → TTSProvider → Audio → WebSocket → Telephony → Caller
 */

import { WebSocket } from 'ws';
import {
    CognitiveInput,
    SupportedLanguage,
    DbAIEmployeePersona,
} from '@zentrix/types';

import rohanCognitiveLoop from '../agent/RohanAgent';
import rohanPersonaEngine from '../employees/Rohan/Persona';
import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';

import {
    BaseVoiceAdapter,
    BaseVoiceSession,
    BaseVoiceLatencyMetrics,
    VoiceConnectionMetadata,
    PersonaEngine,
} from './BaseVoiceAdapter';
import { ASRProvider } from './ASRProvider';
import { TTSProvider } from './TTSProvider';
import { BargeInHandler } from './BargeInHandler';
import { FillerWordManager } from './FillerWordManager';

// ── Types ──────────────────────────────────────────────────────────

export interface VoiceSession extends BaseVoiceSession {}

export interface VoiceLatencyMetrics extends BaseVoiceLatencyMetrics {}

// ── RohanVoiceAdapter ──────────────────────────────────────────────

export class RohanVoiceAdapter extends BaseVoiceAdapter<VoiceSession, VoiceLatencyMetrics> {

    protected getAdapterTag(): string {
        return '[RohanVoice]';
    }

    protected getPersonaEngine(): PersonaEngine {
        return rohanPersonaEngine;
    }

    protected createSession(
        metadata: VoiceConnectionMetadata,
        ws: WebSocket,
        asr: ASRProvider,
        tts: TTSProvider,
        bargeIn: BargeInHandler,
        filler: FillerWordManager,
    ): VoiceSession {
        return {
            sessionId: metadata.sessionId,
            tenantId: metadata.tenantId,
            personaId: metadata.personaId,
            leadId: metadata.leadId,
            language: metadata.language || 'hinglish',
            ws,
            asr,
            tts,
            bargeIn,
            filler,
            isActive: true,
            interimText: '',
            lastInterimText: '',
            stableInterimCount: 0,
            speculativeInFlight: false,
            speculativeResult: null,
            lastSpeculativeAt: 0,
            turnFinalized: false,
            turnStartedAt: 0,
        };
    }

    protected buildCognitiveInput(session: VoiceSession, transcript: string): CognitiveInput {
        return {
            tenant_id: session.tenantId,
            persona_id: session.personaId,
            lead_id: session.leadId,
            channel: 'voice',
            user_message: transcript,
            detected_language: session.language,
        };
    }

    protected async runCognitiveLoop(input: CognitiveInput, onSentence?: (sentence: string) => void) {
        return rohanCognitiveLoop.processCycle(input, onSentence);
    }

    protected async generateGreeting(persona: DbAIEmployeePersona, session: VoiceSession): Promise<string> {
        let name = 'there';
        if (session.leadId) {
            try {
                const { rows } = await pool.query(
                    `SELECT name FROM leads WHERE id = $1 AND tenant_id = $2`,
                    [session.leadId, session.tenantId]
                );
                if (rows.length > 0 && rows[0].name) {
                    name = rows[0].name;
                }
            } catch (err: any) {
                logger.warn(`[RohanVoice] Failed to load lead name for greeting: ${err.message}`);
            }
        }
        return rohanPersonaEngine.generateGreeting(
            persona,
            name,
            undefined,
            'voice'
        );
    }

    protected extractResponse(result: Awaited<ReturnType<typeof rohanCognitiveLoop.processCycle>>) {
        return {
            text: result.fast_response.text,
            filler_prefix: result.fast_response.filler_prefix,
            language: result.fast_response.language,
            latency_ms: result.fast_response.latency_ms,
        };
    }

    protected async onPostCommit(): Promise<void> {
        // Rohan has no post-commit hooks (no handoff logic)
    }

    protected buildBargeInMetric(session: VoiceSession): VoiceLatencyMetrics {
        return {
            sessionId: session.sessionId,
            asrFinalMs: 0,
            llmMs: 0,
            ttsFirstByteMs: 0,
            totalMs: 0,
            bargeIn: true,
        };
    }

    protected buildResponseMetric(
        session: VoiceSession,
        asrFinalMs: number,
        llmMs: number,
        ttsFirstByteMs: number,
        totalMs: number,
    ): VoiceLatencyMetrics {
        return {
            sessionId: session.sessionId,
            asrFinalMs,
            llmMs,
            ttsFirstByteMs,
            totalMs,
            bargeIn: false,
        };
    }
}

export default new RohanVoiceAdapter();
// Trigger watched restart for database voice config updates
