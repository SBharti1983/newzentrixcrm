# ADR 0002: Type-Safe Hybrid Event Bus (`@zentrix/events`)

* **Status:** Accepted
* **Date:** 2026-07-14

## Context and Problem
Direct synchronous service calls (e.g. `LeadController` calling `NotificationService` or `AIService` directly in-thread) introduce coupling, increase request latency, and risk request crashes. We need a decoupled event-driven routing model.

## Decision
We build a shared workspace package `@zentrix/events` providing a type-safe **Hybrid Event Bus**:
1. **Local Channel:** Uses Node.js `EventEmitter` for fast, in-memory event delivery within the same process (latency under 0.05ms).
2. **Cross-Process Channel:** Uses Redis Pub/Sub client duplication to broadcast events across independent node processes (e.g. Express API to worker daemon).
3. **Contracts:** Standardizes typescript interfaces for payloads like `lead:created` and `call:ended`.

## Consequences
* **Pros:** Complete decoupling of routes from async triggers, resilient error boundaries, and sub-millisecond local latency.
* **Cons:** Event flows are asynchronous, requiring database validation updates to be tracked safely.
