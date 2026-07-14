# Rohan — AI Digital Employee Architecture

## Overview

Rohan is an AI Digital Employee that mimics a real sales associate (Rohan Mishra) for Indian SMEs. He handles inbound/outbound voice calls, WhatsApp conversations, and follow-ups — all with ultra-low latency and human-like conversation across Indian regional languages and dialects.

## Core Architecture: Two-Track Cognitive Loop

The key innovation is the **Two-Track Parallel Architecture** that achieves both ultra-low latency AND chain-of-thought reasoning:

```
┌─────────────────────────────────────────────────────────┐
│                    User Input                            │
│                    (voice/text)                          │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
      ┌────────▼────────┐        ┌────────▼────────┐
      │   TRACK A       │        │   TRACK B       │
      │   Fast Path     │        │   Reasoning     │
      │   (visible)     │        │   (background)  │
      │                 │        │                 │
      │ Gemini 2.5 Flash│        │ Gemini Pro /    │
      │ ~200ms          │        │ GPT-4o          │
      │                 │        │ ~1-2s (async)   │
      │ Immediate      │        │ CoT reasoning   │
      │ spoken reply    │        │ + strategy      │
      └────────┬────────┘        └────────┬────────┘
               │                          │
               ▼                          ▼
      ┌────────────────┐        ┌────────────────────┐
      │ Caller hears   │        │ Enriches context   │
      │ response       │        │ for NEXT turn      │
      │ (~700ms total) │        │ (stored in memory)  │
      └────────────────┘        └────────────────────┘
```

### Why Two Tracks?

- **Track A** (fast) generates the immediate response — never blocks on reasoning
- **Track B** (reasoning) runs CoT in the background — enriches Track A's context for the *next* turn
- **Zero added latency** on the voice path, but Rohan gets progressively smarter within a conversation

## Latency Budget (Voice Channel)

| Stage | Target | Technology |
|-------|--------|------------|
| Audio transport | 50ms | WebSocket / WebRTC |
| Streaming ASR | 150-200ms | Sarvam Saaras / Deepgram |
| Endpointing | 50ms | VAD + semantic |
| LLM (Track A) | 200ms | Gemini 2.5 Flash |
| Streaming TTS | 150ms | Sarvam / Cartesia |
| **Total** | **~700ms** | |

## Components

### 1. RohanPersonaEngine ([RohanPersonaEngine.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/api/src/services/digital-employee/RohanPersonaEngine.ts))
- Loads persona identity from PostgreSQL (`ai_employee_personas` table)
- Builds system prompts for Track A (condensed) and Track B (full CoT)
- Evaluates escalation rules
- Manages voice configuration per language
- Generates greetings and filler words

### 2. RohanMemory ([RohanMemory.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/api/src/services/digital-employee/RohanMemory.ts))
Three-tier memory:
- **Tier 1 (Redis):** Live conversation state, sub-ms access, 1h TTL
- **Tier 2 (PostgreSQL):** Lead profile, interaction history, conversation_state
- **Tier 3 (Vector DB):** Semantic search of past conversations (future)

Graceful degradation: If Redis is down, falls back to PostgreSQL-only.

### 3. RohanCognitiveLoop ([RohanCognitiveLoop.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/api/src/services/digital-employee/RohanCognitiveLoop.ts))
The "brain" — orchestrates the two-track pipeline:
- Loads context via Memory
- Generates fast response (Track A) — synchronous, on critical path
- Generates reasoning (Track B) — async, off critical path
- Updates conversation state and CRM
- Triggers escalations when needed

### 4. RohanChannelAdapters (Future adapter plans)
Channel-specific I/O:
- **Voice:** FreeSWITCH WebSocket → streaming ASR → TTS
- **WhatsApp:** Meta Cloud API webhook → text response
- **Outbound:** SIP dial-out with contextual script generation

## Monorepo Architecture Boundaries

To ensure that responsibilities do not overlap between the main backend application and your microservices, we follow a strict boundary definition:

### 1. `apps/api` (The public Gateway & BFF)
* **Responsibility**: Serving user authentication, serving client UI dashboards, accepting webhooks, authorization roles, and initial request routing.
* **Network visibility**: Exposed to public internet.
* **Internal connection**: Triggers background queues, publishes message events, or makes HTTP calls to internal services/ workers.

### 2. `services/` (Isolated background workers)
* **Responsibility**: Specific tasks requiring heavy computing or persistent asynchronous streaming (e.g. `services/voice` handles real-time RTMP/LiveKit calls; `services/notification` consumes job messages to send WhatsApp alerts).
* **Network visibility**: Private. No public ingress allowed. Communicates purely via internal Redis queues, RabbitMQ/BullMQ, or internal port mappings.

---

## Database Schema

See: `apps/api/src/db/schema.ts` (using PostgreSQL Drizzle ORM)

Tables:
- `ai_employee_personas` — identity, voice, knowledge, escalation rules
- `ai_conversation_memory` — per-lead conversation state
- `ai_reasoning_log` — Track B CoT audit trail
- `ai_escalation_events` — human handoff events
- `ai_employee_metrics` — daily performance rollup (for leaderboard)

## Indian Language Support

| Component | Provider | Languages |
|-----------|----------|-----------|
| ASR | Sarvam AI Saaras v2 | 11 Indian langs + code-mix |
| TTS | Sarvam Saaras | Hindi, Tamil, Telugu, etc. |
| LLM | Gemini 2.5 Flash | Multilingual, handles code-mix |
| Fallback ASR | Deepgram Nova-3 | Hindi, Tamil, Bengali |

Code-mixing (Hindi-English) is handled natively — the ASR outputs verbatim, and the LLM prompt explicitly instructs understanding regardless of language.

## Integration with Existing ZentrixCRM

| Existing Service | Rohan Integration |
|---|---|
| `aiScreener.ts` | Rohan's first outreach (handshake) |
| `chatbotService.ts` | Rohan's WhatsApp brain (upgraded with memory + CoT) |
| `NurtureAutoPilot.ts` | Rohan's followup scheduler |
| `automationEngine.ts` | Rohan's trigger system |
| `telephony.ts` | Rohan's voice channel + post-call logging |
| `aiService.ts` | Rohan's post-call reflection (feeds back to memory) |

## Implementation Status

- [x] SQL migration (`rohan_ai_employee_v1.sql`)
- [x] Type definitions (`rohan.types.ts`)
- [x] Memory layer (`RohanMemory.ts`)
- [x] Persona engine (`RohanPersonaEngine.ts`)
- [x] Cognitive loop (`RohanCognitiveLoop.ts`)
- [ ] Channel adapters
- [ ] Barrel export (`index.ts`)
- [ ] Integration with existing services
