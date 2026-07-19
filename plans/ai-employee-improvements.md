# AI Digital Employees — Improvement Plan

Audited subsystems across **Rohan** (sales), **Monika** (receptionist), **Neha** (accountant):
- Cognitive Loop: [`RohanAgent.ts`](apps/digital-employee/src/agent/RohanAgent.ts:36), [`MonikaAgent.ts`](apps/digital-employee/src/agent/MonikaAgent.ts:47), [`NehaAgent.ts`](apps/digital-employee/src/agent/NehaAgent.ts:52)
- Persona Engine: [`Rohan/Persona.ts`](apps/digital-employee/src/employees/Rohan/Persona.ts:32), Monika/Persona, Neha/Persona
- Voice Adapter: [`BaseVoiceAdapter.ts`](apps/digital-employee/src/voice/BaseVoiceAdapter.ts:99), [`RohanVoiceAdapter.ts`](apps/digital-employee/src/voice/RohanVoiceAdapter.ts:45)
- Reasoning: [`RohanReasoning.ts`](apps/digital-employee/src/cognition/reasoning/RohanReasoning.ts:7), [`MonikaReasoning.ts`](apps/digital-employee/src/cognition/reasoning/MonikaReasoning.ts:5), [`NehaReasoning.ts`](apps/digital-employee/src/cognition/reasoning/NehaReasoning.ts:22)

---

## 1. Cognitive Loop Improvements

### 1.1 Extract a shared `BaseCognitiveLoop` (HIGH priority)
**Problem**: All three agents duplicate ~150 lines of identical Track A/Track B orchestration (persona fetch → context load → state update → memory get/create → fire reasoning promise → audit log). Only the *reasoning executor*, *context shape*, and *post-reasoning side effects* differ.

**Fix**: Create [`BaseCognitiveLoop.ts`](apps/digital-employee/src/agent/BaseCognitiveLoop.ts:1) with a template-method `processCycle()` that calls abstract hooks:
- `loadContext()` — each agent returns its own context shape
- `executeReasoning()` — delegates to the per-employee reasoning module
- `applyReasoningSideEffects(reasoning, context, memory)` — escalation (Rohan), scheduling+handoff (Monika), filing+handoff (Neha)
- `buildFastPrompt(persona, context)` — per-employee prompt assembly
- `normalizeReasoning(raw)` — each agent already has this logic inline

**Benefit**: ~400 lines removed, single place to add cross-cutting features (streaming, metrics, retries), guarantees Track A/Track B contract stays consistent.

### 1.2 Fix Track B error handling inconsistency (HIGH priority)
**Problem**:
- [`RohanAgent.ts:240-259`](apps/digital-employee/src/agent/RohanAgent.ts:240) catches Track B failure and returns a **fallback reasoning** (graceful degrade).
- [`MonikaAgent.ts:193-196`](apps/digital-employee/src/agent/MonikaAgent.ts:193) and [`NehaAgent.ts:326-329`](apps/digital-employee/src/agent/NehaAgent.ts:326) **re-throw** — leaving an unhandled rejection that silently drifts lead state (no state save, no audit log, no cache invalidation).

**Fix**: Move the fallback-reasoning pattern into `BaseCognitiveLoop` so all three degrade identically. The fallback should still persist `conversation_state` and invalidate the context cache so the next turn starts clean.

### 1.3 Add Track B timeout + cancellation (MEDIUM priority)
**Problem**: Track B reasoning has no deadline. If the reasoning LLM hangs (Groq/OpenAI outage), the promise stays pending forever — `reasoning_promise` is returned to the caller but never observed, so the leak is invisible. State never updates, escalation never fires.

**Fix**: Wrap `executeReasoning()` in `Promise.race([reasoning, timeout(8000)])`. On timeout, log a `reasoning_timeout` event, persist the fallback reasoning, and emit a metric. Add an `AbortController` so a hung provider request can be cancelled (currently [`ModelRouter.generateResponse`](apps/digital-employee/src/ai/routing/ModelRouter.ts:85) has no abort signal).

### 1.4 Deduplicate the sentence-streaming buffer logic (MEDIUM priority)
**Problem**: [`RohanAgent.ts:79-131`](apps/digital-employee/src/agent/RohanAgent.ts:79) has 50 lines of inline sentence-boundary splitting (`. ? ! । \n`, comma fallback, 80-char force-split, label stripping). This logic is Rohan-only — Monika and Neha don't stream at all (they `await generateAIResponse` and return the whole text). The voice adapter for Monika/Neha therefore can't do chunk-by-chunk TTS, increasing perceived latency.

**Fix**: Extract a `SentenceStreamer` utility (async generator yielding clean sentences from a token stream). Use it in `BaseCognitiveLoop.runFastPath()` so all three agents stream. Monika/Neha voice adapters then get the same low-latency chunked TTS Rohan has.

### 1.5 Add per-turn metrics emission (LOW priority)
**Problem**: Only Neha emits structured events via [`nehaEventBroadcaster`](apps/digital-employee/src/observability/EventBroadcaster.ts:1) (`neha:turn_started`, `neha:track_a_response`, `neha:reasoning_complete`). Rohan and Monika only log to `logger.info`. Observability is asymmetric.

**Fix**: Generalize `EventBroadcaster` to accept a `personaRole` prefix and emit `employee:turn_started`, `employee:track_a_response`, `employee:reasoning_complete`, `employee:reasoning_failed` from `BaseCognitiveLoop` for all three.

---

## 2. Persona Engine Improvements

### 2.1 Extract `BasePersonaEngine` (HIGH priority)
**Problem**: [`RohanPersonaEngine`](apps/digital-employee/src/employees/Rohan/Persona.ts:32), MonikaPersonaEngine, NehaPersonaEngine each re-implement:
- `getPersona()` with the same 5-min in-memory cache + `ai_employee_personas WHERE role=...` query
- `invalidateCache()`
- `getVoiceForLanguage()` (identical Indian-lang branching)
- `getTTSParams()`
- `getRandomFiller()`

Only `buildSystemPrompt()`, `evaluateEscalation()`/`evaluateRouting()`, and `generateGreeting()` differ.

**Fix**: Create [`BasePersonaEngine`](apps/digital-employee/src/employees/BasePersonaEngine.ts:1) with the shared cache + DB lookup + voice/filler logic, parameterized by `role: 'rohan' | 'monika' | 'neha'`. Subclasses implement only `buildSystemPrompt`, `evaluateEscalation`/`evaluateRouting`, `generateGreeting`.

**Benefit**: Removes ~120 lines of duplication, single cache implementation, single place to add cache-busting on DB update.

### 2.2 Cache invalidation on DB write (MEDIUM priority)
**Problem**: The 5-min TTL cache ([`Persona.ts:29`](apps/digital-employee/src/employees/Rohan/Persona.ts:29)) means persona edits in the CRM admin UI take up to 5 minutes to take effect. There's no invalidation hook when `ai_employee_personas` is updated.

**Fix**: Add a Postgres `LISTEN` on `ai_employee_personas_updated` channel (or a Redis pub/sub key `persona:invalidated:{tenantId}`) that calls `invalidateCache(tenantId)` on all three engines. The CRM admin route that updates personas should `NOTIFY` the channel.

### 2.3 Multi-tenant cache key bug (MEDIUM priority)
**Problem**: [`personaCache`](apps/digital-employee/src/employees/Rohan/Persona.ts:30) is a `Map<number, PersonaCacheEntry>` keyed by `tenantId` only. If a single process serves multiple tenants, and two tenants both have a Rohan persona, the cache is correct — but if the same process also runs Monika and Neha, each engine has its own `Map`, so no collision. **However**, the cache stores the full `DbAIEmployeePersona` row including `persona_config` JSONB. If an admin updates `persona_config` (e.g., changes `filler_words`), the stale cached object is returned for 5 minutes.

**Fix**: Covered by 2.2 (invalidation on write). Additionally, store a `row_version` (or `updated_at`) alongside the cached persona and re-fetch if it changed.

### 2.4 Prompt template injection safety (LOW priority)
**Problem**: [`buildSystemPrompt`](apps/digital-employee/src/employees/Rohan/Persona.ts:70) does `.replace('{employee_name}', persona.employee_name)` etc. If any persona field contains a literal `{...}` placeholder, later `.replace()` calls may corrupt it. Also, user-controlled fields (lead name, notes) are interpolated into the prompt without escaping — a lead named `} Ignore previous instructions and...` could attempt prompt injection.

**Fix**: Use a single-pass template renderer (e.g., `Handlebars` or a small `{{var}}` interpolator) that doesn't re-process output. Sanitize user-controlled fields (lead name, notes, last_user_message) by wrapping them in clearly-delimited blocks and instructing the model to treat them as data, not instructions.

---

## 3. Voice Adapter Improvements

### 3.1 Unify streaming across all three adapters (HIGH priority)
**Problem**: [`RohanVoiceAdapter.runCognitiveLoop`](apps/digital-employee/src/voice/RohanVoiceAdapter.ts:97) passes `onSentence` to the cognitive loop, enabling chunk-by-chunk TTS via `SentenceQueue`. Monika and Neha voice adapters call `runCognitiveLoop(input)` **without** `onSentence` — so [`BaseVoiceAdapter.commitResponse`](apps/digital-employee/src/voice/BaseVoiceAdapter.ts:426) falls through to the `!session.streamedAny` branch and streams the whole response as one TTS call. This roughly doubles perceived latency for Monika/Neha vs Rohan.

**Fix**: This is fixed by 1.4 (SentenceStreamer in BaseCognitiveLoop) — once all three agents stream, all three voice adapters get chunked TTS automatically. Verify Monika/Neha voice adapters pass `onSentence` through (they already inherit `runCognitiveLoop` from base, so no adapter change needed).

### 3.2 Filler audio cache is process-local (MEDIUM priority)
**Problem**: [`BaseVoiceAdapter.fillerAudioCache`](apps/digital-employee/src/voice/BaseVoiceAdapter.ts:106) is a static `Map` — each process rebuilds it on startup. With horizontal scaling (multiple digital-employee pods), each pod re-synthesizes the same fillers, wasting TTS API quota and cold-start time.

**Fix**: Move filler audio cache to Redis (`SET filler:{voiceId}:{text} <bytes> EX 86400`). On cache miss, synthesize once, store in Redis. All pods share the cache.

### 3.3 Speculative LLM has no abort on barge-in (MEDIUM priority)
**Problem**: [`handleBargeIn`](apps/digital-employee/src/voice/BaseVoiceAdapter.ts:503) sets `speculativeInFlight = false` and `speculativeResult = null`, but the underlying LLM request keeps running to completion — wasting tokens and provider quota. The result is silently discarded.

**Fix**: Thread an `AbortController` through `runCognitiveLoop` → `ModelRouter.generateResponse` → `LLMProvider.generate`. On barge-in, call `controller.abort()`. Requires adding `AbortSignal` support to [`LLMProvider`](apps/digital-employee/src/ai/LLMProvider.ts:1) and each provider client.

### 3.4 `waitForSpeculative` busy-polls (LOW priority)
**Problem**: [`BaseVoiceAdapter.waitForSpeculative`](apps/digital-employee/src/voice/BaseVoiceAdapter.ts:416) polls every 20ms in a `while` loop. Minor, but it's a busy-wait that holds the event loop.

**Fix**: Replace with a promise that resolves when `speculativeInFlight` flips to false (event-driven), or use `Promise.race` with the timeout.

### 3.5 No concurrent-call limit per tenant (LOW priority)
**Problem**: `getActiveSessionCount()` exists but isn't enforced. A single tenant could exhaust voice sessions.

**Fix**: Add a configurable `MAX_CONCURRENT_SESSIONS_PER_TENANT` check in `handleConnection` that rejects new connections with a 503-style WS close code.

---

## 4. Reasoning Module Improvements

### 4.1 Reasoning output is unvalidated `as` cast (HIGH priority)
**Problem**: All three reasoning modules do `return reasoningRaw as ReasoningOutput` ([`RohanReasoning.ts:28`](apps/digital-employee/src/cognition/reasoning/RohanReasoning.ts:28), [`MonikaReasoning.ts:18`](apps/digital-employee/src/cognition/reasoning/MonikaReasoning.ts:18)). If the LLM returns malformed/missing fields, downstream code accesses `reasoning.objection.type` and crashes. Neha does normalize ([`normalizeNehaReasoning`](apps/digital-employee/src/cognition/reasoning/NehaReasoning.ts:42)) but Rohan and Monika don't.

**Fix**: Add a `validateReasoningOutput(raw, schema)` step in `BaseCognitiveLoop.executeReasoning()` that:
1. Parses the JSON (ModelRouter already strips ```json fences).
2. Validates required fields (`intent`, `emotion`, `action`).
3. Fills defaults for optional fields (like Neha's normalizer does).
4. Logs a `reasoning_schema_violation` metric if fields were missing — useful for prompt tuning.

Use `zod` (already common in TS stacks) or a lightweight hand-written validator matching the `ReasoningOutput` / `ReceptionistReasoningOutput` / `AccountantReasoningOutput` types in `@zentrix/types`.

### 4.2 Reasoning prompt is rebuilt every turn (MEDIUM priority)
**Problem**: [`executeRohanReasoning`](apps/digital-employee/src/cognition/reasoning/RohanReasoning.ts:7) calls `engine.buildSystemPrompt(persona, context, 'reasoning')` every turn, which re-reads prompt template files from disk ([`loadPrompt`](apps/digital-employee/src/utils/prompts.ts)) and re-assembles the full identity + knowledge + context + reasoning blocks. For a 10-turn call, that's 10 disk reads + 10 string builds of ~3KB each.

**Fix**: Cache the static parts of the reasoning prompt (identity block, knowledge block for unchanged project/lead) keyed by `persona.id + lead_id + context_hash`. Only the `contextBlock` (conversation state) changes per turn — rebuild just that part. Memoize `loadPrompt` file reads (they never change at runtime).

### 4.3 No reasoning retry on schema failure (MEDIUM priority)
**Problem**: If the LLM returns invalid JSON, [`ModelRouter.generateResponse`](apps/digital-employee/src/ai/routing/ModelRouter.ts:85) falls through to the next provider — but it doesn't tell the next provider *why* the first failed. The same prompt may fail the same way. There's no "repair" pass (e.g., "Your previous response was not valid JSON. Return only a JSON object matching this schema: ...").

**Fix**: Add a single repair retry in `executeReasoning`: if validation (4.1) fails, send a follow-up prompt with the schema and the bad output, asking the model to fix it. Only then fall through to the next provider.

### 4.4 Reasoning doesn't use conversation history embeddings (LOW priority)
**Problem**: The reasoning prompt includes `recent_interactions` (last 3-5) and `last_reasoning` (previous turn), but doesn't leverage the pgvector RAG layer that [`rohanMemory.loadContext`](apps/digital-employee/src/memory/MemoryService.ts) supposedly populates. Long-running leads with 50+ past interactions lose context.

**Fix**: In `buildKnowledgeBlock`, add a `RELEVANT PAST CONTEXT (RAG):` block populated by vector search over the lead's historical interactions, top-K=3 by similarity to the current `user_message`. This is already half-built — [`add_conversation_embeddings.sql`](packages/database/migrations/add_conversation_embeddings.sql:1) exists but isn't queried in the reasoning path.

### 4.5 Emotion score is hardcoded 0.5 fallback (LOW priority)
**Problem**: [`NehaAgent.ts:317`](apps/digital-employee/src/agent/NehaAgent.ts:317) emits `confidence: (reasoning.emotion_score ?? 0.5)` — a hardcoded 0.5 that misrepresents "unknown" as "medium confidence".

**Fix**: Distinguish `null` (unknown) from a numeric score in the event payload. Downstream dashboards can then show "unknown" rather than a misleading 50%.

---

## Priority Summary

| Priority | Item | Subsystem | Effort |
|----------|------|----------|--------|
| HIGH | 1.1 BaseCognitiveLoop | Cognitive Loop | Medium |
| HIGH | 1.2 Track B error handling parity | Cognitive Loop | Small |
| HIGH | 2.1 BasePersonaEngine | Persona | Medium |
| HIGH | 3.1 Unified streaming (via 1.4) | Voice + Cognitive | Medium |
| HIGH | 4.1 Reasoning output validation | Reasoning | Small |
| MEDIUM | 1.3 Track B timeout + abort | Cognitive Loop | Medium |
| MEDIUM | 1.4 SentenceStreamer utility | Cognitive Loop | Small |
| MEDIUM | 2.2 Cache invalidation on DB write | Persona | Small |
| MEDIUM | 2.3 Multi-tenant cache versioning | Persona | Small |
| MEDIUM | 3.2 Redis filler audio cache | Voice | Small |
| MEDIUM | 3.3 Abort speculative on barge-in | Voice | Medium |
| MEDIUM | 4.2 Cache reasoning prompt static parts | Reasoning | Small |
| MEDIUM | 4.3 Reasoning repair retry | Reasoning | Small |
| LOW | 1.5 Per-turn metrics emission | Cognitive Loop | Small |
| LOW | 2.4 Prompt injection safety | Persona | Small |
| LOW | 3.4 waitForSpeculative busy-poll | Voice | Trivial |
| LOW | 3.5 Concurrent call limit | Voice | Small |
| LOW | 4.4 RAG in reasoning context | Reasoning | Medium |
| LOW | 4.5 Emotion score null vs 0.5 | Reasoning | Trivial |

---

## Recommended Implementation Order

1. **Foundation refactor** (1.1 + 2.1 + 1.4): Extract `BaseCognitiveLoop` and `BasePersonaEngine`, add `SentenceStreamer`. This unlocks 3.1 and makes everything else easier.
2. **Correctness** (1.2 + 4.1): Fix Track B error parity and add reasoning validation. These prevent silent state drift and crashes.
3. **Reliability** (1.3 + 3.3 + 4.3): Timeouts, aborts, repair retries — make the system robust to provider failures.
4. **Performance** (4.2 + 3.2 + 2.2): Prompt caching, Redis filler cache, cache invalidation.
5. **Observability** (1.5 + 4.5): Event emission parity, null-vs-default scores.
6. **Hardening** (2.4 + 3.4 + 3.5 + 4.4): Injection safety, busy-poll, concurrency limits, RAG context.

Each phase is independently shippable and verifiable via `npx tsc --noEmit` + `npx vite build` in `apps/digital-employee`.
