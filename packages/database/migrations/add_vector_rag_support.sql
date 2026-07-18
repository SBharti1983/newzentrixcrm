-- ═══════════════════════════════════════════════════════════════════
-- Vector DB & RAG Support — Schema Migration
-- Enables pgvector extension and creates knowledge chunks table
-- ═══════════════════════════════════════════════════════════════════

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create chunks table (using 768 dimensions for Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_name   VARCHAR(255) NOT NULL,
    chunk_index     INTEGER NOT NULL,
    text_content    TEXT NOT NULL,
    embedding       VECTOR(768) NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Cosine Distance index (HNSW index for fast similarity search)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine 
ON ai_knowledge_chunks 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_chunks_tenant 
ON ai_knowledge_chunks (tenant_id);
