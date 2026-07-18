# ADR 0003: pgvector-Backed RAG Service

* **Status:** Accepted
* **Date:** 2026-07-14

## Context and Problem
The digital employee voice loop (Rohan) needs dynamic access to real-time project inventories, customer records, and training context during calls. Feeding the entire context into LLM system prompts exhausts token limits and increases completion latency.

## Decision
We implement a semantic retrieval-augmented generation (RAG) system (`@zentrix/rag`):
1. **Database:** Reuses Postgres with `pgvector` extension and an HNSW cosine similarity index.
2. **Embeddings:** Generates 768-dimension vectors via Gemini `text-embedding-004`.
3. **Trigger:** The voice agent execution loops (`loadContext` inside `RohanMemory.ts`) queries the vector similarity index on every call turn.

## Consequences
* **Pros:** Highly relevant, token-efficient, dynamic context loading with low database lookup latency.
* **Cons:** Embedding API calls introduce latency overhead, mitigated by caching static profile blocks in Redis.
