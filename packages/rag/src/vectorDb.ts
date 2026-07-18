/**
 * Vector Database Client — pgvector Connector
 * 
 * Interacts with PostgreSQL to store and query document embeddings.
 * Uses the `<=>` operator for Cosine Distance search.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';

export interface VectorChunk {
    id?: string;
    tenantId: number;
    documentName: string;
    chunkIndex: number;
    textContent: string;
    embedding: number[];
    metadata?: Record<string, any>;
}

export interface SearchResult {
    textContent: string;
    documentName: string;
    similarity: number;
    metadata: Record<string, any>;
}

/**
 * Initialize the pgvector extension and create the knowledge chunks table if not exists.
 * Usually run as part of database migrations.
 */
export async function initializeVectorDb(): Promise<void> {
    try {
        logger.info('[VectorDB] Ensuring pgvector extension and table are configured...');
        
        // 1. Enable extension
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        
        // 2. Create chunks table (using 768 dimensions for Gemini text-embedding-004)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       INTEGER NOT NULL,
                document_name   VARCHAR(255) NOT NULL,
                chunk_index     INTEGER NOT NULL,
                text_content    TEXT NOT NULL,
                embedding       VECTOR(768) NOT NULL,
                metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        // 3. Create Cosine Distance index (HNSW index for fast similarity search)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine 
            ON ai_knowledge_chunks 
            USING hnsw (embedding vector_cosine_ops)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chunks_tenant 
            ON ai_knowledge_chunks (tenant_id)
        `);

        logger.info('[VectorDB] Initialization successful');
    } catch (err: any) {
        logger.error(`[VectorDB] Initialization failed: ${err.message}`);
        throw err;
    }
}

/**
 * Store a batch of chunks into the database.
 */
export async function storeChunks(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    // Using single transactions to batch inserts
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const query = `
            INSERT INTO ai_knowledge_chunks 
                (tenant_id, document_name, chunk_index, text_content, embedding, metadata)
            VALUES ($1, $2, $3, $4, $5::vector, $6)
        `;

        for (const chunk of chunks) {
            // Convert float array to PostgreSQL vector literal string format: '[0.123,0.456,...]'
            const vectorString = `[${chunk.embedding.join(',')}]`;
            
            await client.query(query, [
                chunk.tenantId,
                chunk.documentName,
                chunk.chunkIndex,
                chunk.textContent,
                vectorString,
                chunk.metadata || {}
            ]);
        }

        await client.query('COMMIT');
        logger.info(`[VectorDB] Successfully stored ${chunks.length} chunks`);
    } catch (err: any) {
        await client.query('ROLLBACK');
        logger.error(`[VectorDB] Failed to store chunks: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Perform a semantic cosine similarity search.
 * Returns chunks ordered by relevance.
 */
export async function querySimilarity(
    tenantId: number,
    queryEmbedding: number[],
    limit: number = 3,
    minSimilarity: number = 0.5
): Promise<SearchResult[]> {
    try {
        const vectorString = `[${queryEmbedding.join(',')}]`;

        // 1 - (embedding <=> queryEmbedding) = Cosine Similarity
        const query = `
            SELECT text_content, document_name, metadata,
                   (1 - (embedding <=> $1::vector)) as similarity
            FROM ai_knowledge_chunks
            WHERE tenant_id = $2
              AND (1 - (embedding <=> $1::vector)) >= $3
            ORDER BY embedding <=> $1::vector
            LIMIT $4
        `;

        const { rows } = await pool.query(query, [vectorString, tenantId, minSimilarity, limit]);
        
        return rows.map(r => ({
            textContent: r.text_content,
            documentName: r.document_name,
            similarity: parseFloat(r.similarity),
            metadata: r.metadata || {}
        }));
    } catch (err: any) {
        logger.error(`[VectorDB] Semantic search query failed: ${err.message}`);
        return [];
    }
}

/**
 * Delete all knowledge chunks associated with a specific document.
 */
export async function deleteDocumentChunks(tenantId: number, documentName: string): Promise<void> {
    try {
        await pool.query(
            'DELETE FROM ai_knowledge_chunks WHERE tenant_id = $1 AND document_name = $2',
            [tenantId, documentName]
        );
        logger.info(`[VectorDB] Deleted chunks for document "${documentName}" (tenant ${tenantId})`);
    } catch (err: any) {
        logger.error(`[VectorDB] Failed to delete chunks: ${err.message}`);
        throw err;
    }
}
