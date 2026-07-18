/**
 * MonikaVoiceAdapter — Receptionist Voice Streaming Pipeline
 *
 * Extends BaseVoiceAdapter with Monika-specific cognitive loop, persona engine,
 * greeting generation, and call handoff logic. All shared streaming infrastructure
 * lives in the base class.
 *
 * Key behavioural differences from VoiceAdapter:
 *  - Greeting uses Monika's receptionist greeting (time-of-day aware).
 *  - Each turn runs MonikaCognitiveLoop.processCycle (receptionist reasoning).
 *  - onPostCommit evaluates Track B handoff and signals telephony transfer.
 *
 * Audio Flow:
 *   Caller → Telephony → WebSocket → ASRProvider → Text → MonikaCognitiveLoop
 *   MonikaCognitiveLoop → Text → TTSProvider → Audio → WebSocket → Telephony → Caller
 */

import { WebSocket } from 'ws';
import { logger } from '@zentrix/logger';
import {
    ReceptionistCognitiveInput,
    ReceptionistCognitiveResult,
    SupportedLanguage,
    DbAIEmployeePersona,
    HandoffTarget,
} from '@zentrix/types';

import monikaCognitiveLoop from '../agent/MonikaAgent';
import monikaPersonaEngine from '../employees/Monika/Persona';
import { getMonikaHandoffMessage } from '../employees/Monika/Config';

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

export interface MonikaVoiceSession extends BaseVoiceSession {
    callerName?: string;
    callerPhone?: string;
    handoffInitiated: boolean;
    handoffTarget?: HandoffTarget;
}

export interface MonikaVoiceLatencyMetrics extends BaseVoiceLatencyMetrics {
    handoff: boolean;
}

// ── MonikaVoiceAdapter ──────────────────────────────────────────────

export class MonikaVoiceAdapter extends BaseVoiceAdapter<
    MonikaVoiceSession,
    MonikaVoiceLatencyMetrics,
    ReceptionistCognitiveResult
> {
    protected getAdapterTag(): string {
        return '[MonikaVoice]';
    }

    protected getPersonaEngine(): PersonaEngine {
        return monikaPersonaEngine;
    }

    protected createSession(
        metadata: VoiceConnectionMetadata,
        ws: WebSocket,
        asr: ASRProvider,
        tts: TTSProvider,
        bargeIn: BargeInHandler,
        filler: FillerWordManager,
    ): MonikaVoiceSession {
        return {
            sessionId: metadata.sessionId,
            tenantId: metadata.tenantId,
            personaId: metadata.personaId,
            leadId: metadata.leadId,
            language: metadata.language || 'hinglish',
            callerName: metadata.callerName,
            callerPhone: metadata.callerPhone,
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
            handoffInitiated: false,
        };
    }

    protected buildCognitiveInput(session: MonikaVoiceSession, transcript: string): ReceptionistCognitiveInput {
        return {
            tenant_id: session.tenantId,
            persona_id: session.personaId,
            lead_id: session.leadId,
            channel: 'voice',
            user_message: transcript,
            detected_language: session.language,
            user_phone: session.callerPhone,
            caller_name: session.callerName,
        };
    }

    protected async runCognitiveLoop(input: ReceptionistCognitiveInput, onSentence?: (sentence: string) => void): Promise<ReceptionistCognitiveResult> {
        return monikaCognitiveLoop.processCycle(input);
    }

    protected generateGreeting(persona: DbAIEmployeePersona, session: MonikaVoiceSession): string {
        return monikaPersonaEngine.generateGreeting(
            persona,
            session.callerName || 'there',
            'voice'
        );
    }

    protected extractResponse(result: ReceptionistCognitiveResult) {
        return {
            text: result.fast_response.text,
            filler_prefix: result.fast_response.filler_prefix,
            language: result.fast_response.language,
            latency_ms: result.fast_response.latency_ms,
        };
    }

    /**
     * Post-commit hook: evaluate Track B handoff.
     * If the reasoning resolved a handoff, speak the handoff message
     * and signal the telephony layer to transfer the call.
     */
    protected async onPostCommit(session: MonikaVoiceSession, result: ReceptionistCognitiveResult): Promise<void> {
        try {
            const reasoning = await Promise.race([
                result.reasoning_promise,
                new Promise<null>((r) => setTimeout(() => r(null), 1500)),
            ]);

            if (reasoning?.should_handoff && reasoning.handoff_target && !session.handoffInitiated) {
                session.handoffInitiated = true;
                session.handoffTarget = reasoning.handoff_target;

                const engine = this.getPersonaEngine();
                const persona = await engine.getPersona(session.tenantId);
                const voiceId = engine.getVoiceForLanguage(persona, session.language);
                const ttsParams = engine.getTTSParams(persona);

                // Speak the handoff message before transferring
                const handoffMsg = getMonikaHandoffMessage(
                    reasoning.handoff_target,
                    session.callerName || 'ji'
                );
                await this.streamText(session, handoffMsg, voiceId, ttsParams);

                // Signal telephony layer to transfer the call
                this.signalHandoff(session, reasoning.handoff_target, reasoning.handoff_reason || '');
            }
        } catch {
            // Track B not ready — handoff will be evaluated next turn.
        }
    }

    /**
     * Signal the telephony layer (FreeSWITCH / Twilio) to transfer the call.
     */
    private signalHandoff(session: MonikaVoiceSession, target: HandoffTarget, reason: string): void {
        if (session.ws.readyState !== WebSocket.OPEN) return;
        const payload = JSON.stringify({
            type: 'handoff',
            target,
            reason,
            session_id: session.sessionId,
            tenant_id: session.tenantId,
            timestamp: new Date().toISOString(),
        });
        session.ws.send(payload);
        logger.info(`[MonikaVoice] Handoff signal sent (${session.sessionId}) → ${target}`);
    }

    protected buildBargeInMetric(session: MonikaVoiceSession): MonikaVoiceLatencyMetrics {
        return {
            sessionId: session.sessionId,
            asrFinalMs: 0,
            llmMs: 0,
            ttsFirstByteMs: 0,
            totalMs: 0,
            bargeIn: true,
            handoff: false,
        };
    }

    protected buildResponseMetric(
        session: MonikaVoiceSession,
        asrFinalMs: number,
        llmMs: number,
        ttsFirstByteMs: number,
        totalMs: number,
    ): MonikaVoiceLatencyMetrics {
        return {
            sessionId: session.sessionId,
            asrFinalMs,
            llmMs,
            ttsFirstByteMs,
            totalMs,
            bargeIn: false,
            handoff: session.handoffInitiated,
        };
    }

    getAggregateLatency() {
        const base = super.getAggregateLatency();
        return {
            ...base,
            handoffCount: this.metrics.filter((m) => m.handoff).length,
        };
    }
}

export default new MonikaVoiceAdapter();
