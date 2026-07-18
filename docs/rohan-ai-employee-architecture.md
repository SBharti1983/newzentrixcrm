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

The CRM API (`apps/api`) and the digital-employee voice service are
separate processes. Rohan's persona + memory live in the digital-employee,
so the CRM API talks to it over an **HTTP bridge** rather than importing
internal modules directly. This keeps the service boundary clean and lets
each side scale independently.

### Bridge Architecture

```
apps/api (CRM API)                         apps/digital-employee (voice)
┌──────────────────────────┐               ┌─────────────────────────────┐
│ RohanBridgeClient        │  HTTP POST    │ rohanBridge.ts              │
│  (axios + graceful       │ ────────────► │  /rohan/handshake           │
│   fallback, 8s timeout,  │  /rohan/*     │  /rohan/followup            │
│   30s cooldown on fail)  │ ◄──────────── │  /rohan/recall              │
└──────────┬───────────────┘   JSON        │  /rohan/log-call            │
           │                                │  /rohan/health              │
           ▼                                └──────────┬──────────────────┘
   AiScreenerService                                   │
   NurtureAutoPilot                          RohanPersonaEngine + RohanMemory
   InboundRoutes                            (three-tier: Redis → PG → pgvector)
```

**Graceful degradation**: every bridge call returns `null` on failure
(network error, 503, timeout). Callers fall back to their existing
generic AI path, so the CRM keeps working even if the voice service is
down. The client enters a 30-second cooldown after a failure to avoid
thundering-herd retries.

### Wired Services

| Existing Service | Rohan Integration | Bridge Endpoint |
|---|---|---|
| `AiScreenerService.ts` | Persona-driven first outreach (handshake) — falls back to generic prompt | `POST /rohan/handshake` |
| `NurtureAutoPilot.ts` | Memory-aware nurture follow-ups — falls back to `aiService.generateSuggestedMessage` | `POST /rohan/followup` |
| `InboundRoutes.ts` | Post-call logging to memory + pgvector; pre-call semantic recall for agent context | `POST /rohan/log-call`, `GET /rohan/recall` |
| `chatbotService.ts` | *(pending)* Rohan's WhatsApp brain (upgraded with memory + CoT) | — |
| `automationEngine.ts` | *(pending)* Rohan's trigger system | — |
| `aiService.ts` | *(pending)* Rohan's post-call reflection (feeds back to memory) | — |

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `ROHAN_BRIDGE_URL` | `http://localhost:5061` | Digital-employee health server base URL |
| `ROHAN_BRIDGE_TIMEOUT_MS` | `8000` | Per-request timeout before fallback |

## Implementation Status

- [x] SQL migration (`rohan_ai_employee_v1.sql`)
- [x] Type definitions (`rohan.types.ts`)
- [x] Memory layer (`RohanMemory.ts`) — three-tier Redis → PG → pgvector with graceful degradation
- [x] Persona engine (`RohanPersonaEngine.ts`)
- [x] Cognitive loop (`RohanCognitiveLoop.ts`)
- [x] Channel adapters (`RohanChannelAdapters.ts` for Voice/WhatsApp/Outbound)
- [x] Barrel export (`index.ts`)
- [x] pgvector RAG Integration (`@zentrix/rag` for dynamic long-term memory)
- [x] Three-tier memory with circuit breakers + degradation telemetry (`MemoryProvenance`, `MemoryDegradationMetrics`)
- [x] Conversation embedding ingestion (`@zentrix/rag` conversationMemory module + `add_conversation_embeddings.sql` migration)
- [x] HTTP bridge endpoints on digital-employee (`rohanBridge.ts` — handshake, followup, recall, log-call, chat, health)
- [x] RohanBridge client in CRM API (`RohanBridgeClient.ts` — axios + graceful fallback + cooldown)
- [x] AiScreenerService wired to Rohan handshake (persona-driven, falls back to generic prompt)
- [x] NurtureAutoPilot wired to Rohan followup (memory-aware, falls back to aiService)
- [x] Telephony inbound wired to Rohan log-call + recall (post-call indexing, pre-call context)
- [x] ChatbotService wired to Rohan chat (phone→lead resolution, persona-driven WhatsApp brain, falls back to Gemini)
- [x] AutomationService wired to Rohan followup (memory-aware post-site-visit feedback, falls back to aiService.generateFeedbackRequest)
- [x] AiService wired to Rohan log-call (post-call reflection feeds analysis back to memory, fire-and-forget, backward-compatible optional callMeta)
