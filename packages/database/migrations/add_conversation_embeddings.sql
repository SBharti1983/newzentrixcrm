-- ═══════════════════════════════════════════════════════════════════
-- Three-Tier Memory — Tier 3 (pgvector) Conversation Embeddings
-- Stores embeddings of past Rohan ↔ lead conversation turns so future
-- turns can semantically recall prior interactions. Complements the
-- document-only ai_knowledge_chunks table.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Ensure pgvector is available
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Conversation embeddings table (768 dims — Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS ai_conversation_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL,
    lead_id         VARCHAR(100) NOT NULL,
    persona_id      VARCHAR(100) NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    turn_number     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    embedding       VECTOR(768) NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lookup index for "recall this lead's past turns"
CREATE INDEX IF NOT EXISTS idx_conv_emb_tenant_lead
ON ai_conversation_embeddings (tenant_id, lead_id);

-- 4. HNSW cosine index for semantic similarity search
CREATE INDEX IF NOT EXISTS idx_conv_emb_embedding_cosine
ON ai_conversation_embeddings
USING hnsw (embedding vector_cosine_ops);

-- 5. Tenant filter index (vector queries are always tenant-scoped)
CREATE INDEX IF NOT EXISTS idx_conv_emb_tenant
ON ai_conversation_embeddings (tenant_id);
