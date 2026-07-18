/**
 * Digital Employee — Barrel Export
 *
 * Central re-export for all domain modules after the 10-folder
 * architecture migration. Import from here to access any component:
 *
 *   import { rohanAgent, rohanMemory } from './barrel';
 */

// ── Agent (Cognitive Loops) ────────────────────────────────────────
export { default as rohanAgent } from './agent/RohanAgent';
export { default as monikaAgent } from './agent/MonikaAgent';

// ── Persona Engines ────────────────────────────────────────────────
export { default as rohanPersonaEngine } from './employees/Rohan/Persona';
export { default as monikaPersonaEngine } from './employees/Monika/Persona';
export {
    getMonikaHandoffMessage,
    buildMonikaHandoffBrief,
} from './employees/Monika/Config';

// ── Memory ─────────────────────────────────────────────────────────
export { default as rohanMemory } from './memory/MemoryService';

// ── Skills ─────────────────────────────────────────────────────────
export { default as siteVisitBooking } from './skills/SiteVisitBooking';

// ── Channels ───────────────────────────────────────────────────────
export { default as channelRouter } from './channels/ChannelRouter';
export {
    WhatsAppAdapter,
    OutboundDialer,
    RohanChannelAdapters,
} from './channels/ChannelRouter';
export type {
    WhatsAppInboundEvent,
    OutboundCallRequest,
    OutboundCallResult,
    SIPProvider,
} from './channels/ChannelRouter';

// ── Workflow (HTTP Bridges) ────────────────────────────────────────
export { mountRohanBridge } from './workflows/bridges/RohanBridge';

// ── Voice Components ───────────────────────────────────────────────
export { default as rohanVoiceAdapter, RohanVoiceAdapter } from './voice/RohanVoiceAdapter';
export { default as monikaVoiceAdapter, MonikaVoiceAdapter } from './voice/MonikaVoiceAdapter';
export type { VoiceSession } from './voice/RohanVoiceAdapter';
export { ASRProvider } from './voice/ASRProvider';
export { TTSProvider } from './voice/TTSProvider';
export { BargeInHandler } from './voice/BargeInHandler';

// ── Reasoning ──────────────────────────────────────────────────────
export { executeRohanReasoning } from './cognition/reasoning/RohanReasoning';
export { executeMonikaReasoning } from './cognition/reasoning/MonikaReasoning';

// ── Integrations ───────────────────────────────────────────────────
export { default as crmClient } from './integrations/crm/CrmClient';
export { default as crmUpdater } from './integrations/crm/CrmUpdater';

// ── Transport ──────────────────────────────────────────────────────
export { startWsServer } from './transport/WsServer';
export { startHealthServer } from './transport/HealthServer';

