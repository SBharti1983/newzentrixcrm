/**
 * Embeddings Generator — Gemini Embedding Client
 * 
 * Uses the official Google Gen AI SDK to convert text chunks into
 * 768-dimension vector embeddings using the 'text-embedding-004' model.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@zentrix/logger';

let genAI: GoogleGenerativeAI | null = null;

function getAIClient(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();
        if (!apiKey) {
            throw new Error('❌ [Embeddings] GEMINI_API_KEY is not configured in process.env');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * Generate a vector embedding for a single text chunk.
 * Returns a 768-dimension float array.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    try {
        const ai = getAIClient();
        const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
        
        const result = await model.embedContent(text);
        if (result.embedding && result.embedding.values) {
            return result.embedding.values;
        }
        throw new Error('No embedding values returned from Gemini API');
    } catch (err: any) {
        logger.error(`[Embeddings] Failed to generate embedding: ${err.message}`);
        // Return a mock vector of 768 zeroes in case of API failure so the service degrades gracefully
        return new Array(768).fill(0);
    }
}

/**
 * Generate vector embeddings for a batch of text chunks.
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
        const ai = getAIClient();
        const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
        
        const result = await model.batchEmbedContents({
            requests: texts.map(text => ({
                content: { role: 'user', parts: [{ text }] }
            }))
        });

        if (result.embeddings) {
            return result.embeddings.map(e => e.values);
        }
        throw new Error('No embeddings returned from Gemini API batch request');
    } catch (err: any) {
        logger.error(`[Embeddings] Batch generation failed: ${err.message}`);
        return texts.map(() => new Array(768).fill(0));
    }
}
