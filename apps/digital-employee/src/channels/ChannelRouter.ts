/**
 * RohanChannelAdapters — Unified Multi-Channel Orchestrator
 *
 * Rohan operates across three channels:
 *   1. Voice     — Inbound/outbound calls via WebSocket (VoiceAdapter)
 *   2. WhatsApp   — Inbound/outbound text messages via Meta Cloud API
 *   3. Outbound    — Scheduled SIP dial-out campaigns (Exotel / Twilio / Jio)
 *
 * This module provides:
 *   - WhatsAppAdapter  : tenant-aware Meta Cloud API send + inbound webhook ingestion
 *   - OutboundDialer   : calling-hours enforcement, concurrency limits, SIP dial-out
 *   - RohanChannelAdapters : unified router that funnels CognitiveInput from any
 *                            channel into RohanCognitiveLoop.processCycle()
 *
 * NOTE: This module lives inside apps/digital-employee — isolated from CRM API traffic.
 */

import { WebSocket } from 'ws';
import axios from 'axios';
import crypto from 'crypto';
import CircuitBreaker from 'opossum';
import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    CognitiveInput,
    CognitiveResult,
    ChannelType,
    SupportedLanguage,
} from '@zentrix/types';

import rohanCognitiveLoop from '../agent/RohanAgent';
import { RohanVoiceAdapter } from '../voice/RohanVoiceAdapter';

// ═══════════════════════════════════════════════════════════════════
// WhatsApp Adapter
// ═══════════════════════════════════════════════════════════════════

export interface WhatsAppInboundEvent {
    tenantId: number;
    personaId: string;
    leadId?: string;
    fromPhone: string;
    messageText: string;
    messageId: string;
    timestamp: number;
}

export class WhatsAppAdapter {
    private breaker: CircuitBreaker<[number, string, string], boolean>;

    constructor() {
        this.breaker = new CircuitBreaker(this._send.bind(this), {
            timeout: 10000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        });
        this.breaker.fallback((err: any) => {
            logger.warn(`[WhatsAppAdapter] Circuit breaker active: ${err?.message || 'open'}`);
            return false;
        });
    }

    /**
     * Send a WhatsApp text message to a lead.
     * Fetches tenant-specific API keys from the database (same pattern as apps/api).
     */
    private async _send(tenantId: number, toPhone: string, messageText: string): Promise<boolean> {
        const { rows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
        if (!rows.length) return false;

        const settings = rows[0].settings || {};
        const apiToken = settings.whatsapp_api_key;
        const phoneId = settings.whatsapp_phone_id;

        if (!apiToken || !phoneId || apiToken === 'Not configured') {
            logger.info(`[WhatsAppAdapter] Skipped: keys not configured for tenant ${tenantId}`);
            return false;
        }

        // Format phone (Meta requires country code without + or leading zeros)
        let formattedPhone = toPhone.replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = `91${formattedPhone}`; // Default to India (+91)
        }

        const response = await axios.post(
            `https://graph.facebook.com/v17.0/${phoneId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: messageText },
            },
            {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status !== 200) {
            logger.error(`[WhatsAppAdapter] Meta API Error: ${response.data?.error?.message}`);
            return false;
        }

        logger.info(`[WhatsAppAdapter] Sent to ${formattedPhone}`);
        return true;
    }

    /**
     * Public send wrapper (goes through circuit breaker).
     */
    async send(tenantId: number, toPhone: string, messageText: string): Promise<boolean> {
        return this.breaker.fire(tenantId, toPhone, messageText);
    }

    /**
     * Ingest an inbound WhatsApp webhook event and route to the cognitive loop.
     * Returns the response text Rohan generated (to be sent back as a reply).
     */
    async handleInbound(event: WhatsAppInboundEvent): Promise<string | null> {
        try {
            const input: CognitiveInput = {
                tenant_id: event.tenantId,
                persona_id: event.personaId,
                lead_id: event.leadId,
                channel: 'whatsapp',
                user_message: event.messageText,
                user_phone: event.fromPhone,
                is_first_turn: false,
                metadata: {
                    call_id: event.messageId,
                },
            };

            const result: CognitiveResult = await rohanCognitiveLoop.processCycle(input);
            const replyText = result.fast_response.text;

            // Send the reply back via WhatsApp
            await this.send(event.tenantId, event.fromPhone, replyText);

            // Fire-and-forget Track B reasoning
            result.reasoning_promise.catch((err) =>
                logger.error(`[WhatsAppAdapter] Track B reasoning failed: ${err?.message}`)
            );

            return replyText;
        } catch (err: any) {
            logger.error(`[WhatsAppAdapter] Inbound handling failed: ${err?.message}`);
            return null;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// Outbound Dialer (SIP dial-out)
// ═══════════════════════════════════════════════════════════════════

export type SIPProvider = 'exotel' | 'twilio' | 'jio' | 'gsm_gateway';

export interface OutboundCallRequest {
    tenantId: number;
    personaId: string;
    leadId: string;
    leadName: string;
    phoneNumber: string;
    language?: SupportedLanguage;
    campaignId?: string;
}

export interface OutboundCallResult {
    callId: string;
    status: 'initiated' | 'failed' | 'outside_hours' | 'capacity_full';
    provider: SIPProvider;
    message?: string;
}

export class OutboundDialer {
    private activeCalls = new Map<string, OutboundCallRequest>();
    private maxConcurrent: number;
    private callingHours: { start: number; end: number }; // 24h format
    private timezone: string;

    constructor(config?: {
        maxConcurrent?: number;
        callingHours?: { start: number; end: number };
        timezone?: string;
    }) {
        this.maxConcurrent = config?.maxConcurrent ?? 10;
        this.callingHours = config?.callingHours ?? { start: 9, end: 21 }; // 9 AM - 9 PM
        this.timezone = config?.timezone ?? 'Asia/Kolkata';
    }

    /**
     * Check if current time is within allowed calling hours.
     * Uses Asia/Kolkata by default (IST = UTC+5:30).
     */
    private isWithinCallingHours(): boolean {
        // IST offset is +5:30 from UTC
        const now = new Date();
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffsetMs);
        const hour = istTime.getUTCHours();
        return hour >= this.callingHours.start && hour < this.callingHours.end;
    }

    /**
     * Fetch tenant SIP provider config from the database.
     */
    private async getProviderConfig(tenantId: number): Promise<{
        provider: SIPProvider;
        apiKey: string;
        apiSecret?: string;
        sid?: string;
        fromNumber?: string;
    } | null> {
        const { rows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
        if (!rows.length) return null;

        const settings = rows[0].settings || {};
        const sip = settings.sip_config || {};
        if (!sip.provider || !sip.api_key) return null;

        return {
            provider: sip.provider as SIPProvider,
            apiKey: sip.api_key,
            apiSecret: sip.api_secret,
            sid: sip.sid,
            fromNumber: sip.from_number,
        };
    }

    /**
     * Initiate an outbound call via the configured SIP provider.
     */
    async dial(request: OutboundCallRequest): Promise<OutboundCallResult> {
        // 1. Calling hours enforcement
        if (!this.isWithinCallingHours()) {
            logger.info(`[OutboundDialer] Skipped: outside calling hours for lead ${request.leadId}`);
            return {
                callId: '',
                status: 'outside_hours',
                provider: 'exotel',
                message: 'Current time is outside allowed calling hours (9 AM - 9 PM IST)',
            };
        }

        // 2. Concurrency check
        if (this.activeCalls.size >= this.maxConcurrent) {
            logger.warn(`[OutboundDialer] Skipped: max concurrent calls (${this.maxConcurrent}) reached`);
            return {
                callId: '',
                status: 'capacity_full',
                provider: 'exotel',
                message: `Max concurrent calls (${this.maxConcurrent}) reached`,
            };
        }

        // 3. Fetch provider config
        const providerConfig = await this.getProviderConfig(request.tenantId);
        if (!providerConfig) {
            logger.error(`[OutboundDialer] No SIP config for tenant ${request.tenantId}`);
            return {
                callId: '',
                status: 'failed',
                provider: 'exotel',
                message: 'SIP provider not configured for this tenant',
            };
        }

        // 4. Format phone number
        let formattedPhone = request.phoneNumber.replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = `91${formattedPhone}`;
        }

        // 5. Initiate call via provider
        try {
            const callId = await this.initiateSIPCall(providerConfig, formattedPhone, request);
            this.activeCalls.set(callId, request);
            logger.info(`[OutboundDialer] Call initiated: ${callId} → ${formattedPhone} (lead ${request.leadId})`);

            return {
                callId,
                status: 'initiated',
                provider: providerConfig.provider,
            };
        } catch (err: any) {
            logger.error(`[OutboundDialer] SIP call failed: ${err?.message}`);
            return {
                callId: '',
                status: 'failed',
                provider: providerConfig.provider,
                message: err?.message || 'Unknown SIP error',
            };
        }
    }

    /**
     * Provider-specific SIP call initiation.
     * TODO: Implement actual API calls for Exotel / Twilio / Jio.
     */
    private async initiateSIPCall(
        config: { provider: SIPProvider; apiKey: string; apiSecret?: string; sid?: string; fromNumber?: string },
        toPhone: string,
        request: OutboundCallRequest
    ): Promise<string> {
        const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        switch (config.provider) {
            case 'exotel': {
                // Exotel REST API: POST https://{sid}.api.exotel.com/v1/Accounts/{sid}/Calls/connect
                // TODO: Implement actual Exotel API call
                // await axios.post(`https://${config.sid}.api.exotel.com/v1/Accounts/${config.sid}/Calls/connect`, ...)
                logger.info(`[OutboundDialer] Exotel call stub → ${toPhone}`);
                return callId;
            }
            case 'twilio': {
                // Twilio REST API: POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json
                // TODO: Implement actual Twilio API call
                logger.info(`[OutboundDialer] Twilio call stub → ${toPhone}`);
                return callId;
            }
            case 'jio': {
                // Jio SIP trunk API
                // TODO: Implement actual Jio SIP call
                logger.info(`[OutboundDialer] Jio call stub → ${toPhone}`);
                return callId;
            }
            case 'gsm_gateway': {
                // GSM Gateway REST API or local SIP trunk invite (e.g. Dinstar/GoIP HTTP/SIP api)
                logger.info(`[OutboundDialer] GSM Gateway call stub → ${toPhone}`);
                return callId;
            }
            default:
                throw new Error(`Unknown SIP provider: ${config.provider}`);
        }
    }

    /**
     * Mark a call as completed (frees a concurrency slot).
     */
    completeCall(callId: string): void {
        if (this.activeCalls.delete(callId)) {
            logger.info(`[OutboundDialer] Call completed: ${callId} (active: ${this.activeCalls.size})`);
        }
    }

    /**
     * Get current active call count.
     */
    getActiveCallCount(): number {
        return this.activeCalls.size;
    }
}

// ═══════════════════════════════════════════════════════════════════
// Unified Channel Adapters Router
// ═══════════════════════════════════════════════════════════════════

export class RohanChannelAdapters {
    public voice: RohanVoiceAdapter;
    public whatsapp: WhatsAppAdapter;
    public outbound: OutboundDialer;

    constructor() {
        this.voice = new RohanVoiceAdapter();
        this.whatsapp = new WhatsAppAdapter();
        this.outbound = new OutboundDialer();
    }

    /**
     * Route an incoming message from any channel to the cognitive loop.
     * This is the single entry point for all Rohan interactions.
     */
    async route(input: CognitiveInput): Promise<CognitiveResult> {
        const channelLabel: Record<ChannelType, string> = {
            voice: '🎤 Voice',
            whatsapp: '💬 WhatsApp',
            outbound: '📞 Outbound',
        };
        logger.info(
            `${channelLabel[input.channel]} | tenant=${input.tenant_id} lead=${input.lead_id || 'N/A'} | "${input.user_message.slice(0, 60)}"`
        );
        return rohanCognitiveLoop.processCycle(input);
    }

    /**
     * Handle a voice WebSocket connection (delegates to VoiceAdapter).
     */
    async handleVoiceConnection(
        ws: WebSocket,
        metadata: { sessionId?: string; tenantId: number; personaId: string; leadId?: string; language?: SupportedLanguage }
    ): Promise<void> {
        await this.voice.handleConnection(ws, {
            sessionId: metadata.sessionId || crypto.randomUUID(),
            tenantId: metadata.tenantId,
            personaId: metadata.personaId,
            leadId: metadata.leadId,
            language: metadata.language
        });
    }

    /**
     * Handle an inbound WhatsApp message (delegates to WhatsAppAdapter).
     */
    async handleWhatsAppInbound(event: WhatsAppInboundEvent): Promise<string | null> {
        return this.whatsapp.handleInbound(event);
    }

    /**
     * Initiate an outbound call (delegates to OutboundDialer).
     */
    async initiateOutboundCall(request: OutboundCallRequest): Promise<OutboundCallResult> {
        return this.outbound.dial(request);
    }
}

// ── Default singleton ──────────────────────────────────────────────
const rohanChannelAdapters = new RohanChannelAdapters();
export default rohanChannelAdapters;
