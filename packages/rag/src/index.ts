/**
 * @zentrix/rag — Retrieval-Augmented Generation Package
 * 
 * Provides unified semantic search ingestion and retrieval services.
 */

import { getEmbedding, getEmbeddingsBatch } from './embeddings';
import { chunkText } from './chunking';
import { storeChunks, querySimilarity, deleteDocumentChunks, initializeVectorDb, SearchResult } from './vectorDb';
import {
    initializeConversationVectorStore,
    storeConversationTurn,
    retrieveSimilarConversations,
    ConversationTurnRecord,
    ConversationRecallResult,
} from './conversationMemory';
import { logger } from '@zentrix/logger';

export {
    getEmbedding,
    getEmbeddingsBatch,
    chunkText,
    storeChunks,
    querySimilarity,
    deleteDocumentChunks,
    initializeVectorDb,
    SearchResult,
    initializeConversationVectorStore,
    storeConversationTurn,
    retrieveSimilarConversations,
    ConversationTurnRecord,
    ConversationRecallResult,
};

export class RAGService {
    /**
     * Ingest a full text document (brochure, FAQ, terms) into the vector DB.
     * Splits into chunks, generates embeddings in batch, and stores them.
     */
    static async ingestDocument(
        tenantId: number,
        documentName: string,
        textContent: string,
        metadata: Record<string, any> = {}
    ): Promise<number> {
        try {
            logger.info(`[RAG] Starting ingestion for document "${documentName}" (tenant ${tenantId})...`);

            // 1. Clean up any existing chunks for this document
            await deleteDocumentChunks(tenantId, documentName);

            // 2. Chunk text
            const chunks = chunkText(textContent, { chunkSize: 600, chunkOverlap: 120 });
            if (chunks.length === 0) return 0;

            // 3. Batch generate embeddings
            const texts = chunks.map(c => c.text);
            const embeddings = await getEmbeddingsBatch(texts);

            // 4. Map to vector db records
            const dbChunks = chunks.map((chunk, index) => ({
                tenantId,
                documentName,
                chunkIndex: index,
                textContent: chunk.text,
                embedding: embeddings[index],
                metadata: {
                    ...metadata,
                    startIndex: chunk.startIndex,
                    endIndex: chunk.endIndex
                }
            }));

            // 5. Save chunks
            await storeChunks(dbChunks);
            logger.info(`[RAG] Successfully ingested "${documentName}" into Vector DB (${dbChunks.length} chunks)`);
            return dbChunks.length;
        } catch (err: any) {
            logger.error(`[RAG] Ingestion failed for "${documentName}": ${err.message}`);
            throw err;
        }
    }

    /**
     * Search knowledge base using natural language.
     * Generates embedding for the query and searches the vector space.
     */
    static async retrieveContext(
        tenantId: number,
        queryText: string,
        limit: number = 3,
        minSimilarity: number = 0.65
    ): Promise<string[]> {
        try {
            logger.info(`[RAG] Searching context for query: "${queryText.substring(0, 50)}..."`);

            // 1. Get embedding for the query
            const queryEmbedding = await getEmbedding(queryText);

            // 2. Perform vector search
            const results = await querySimilarity(tenantId, queryEmbedding, limit, minSimilarity);

            logger.info(`[RAG] Found ${results.length} relevant context chunks`);
            return results.map(r => r.textContent);
        } catch (err: any) {
            logger.error(`[RAG] Context retrieval failed: ${err.message}`);
            return [];
        }
    }
}
