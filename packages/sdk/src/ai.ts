/**
 * Zentrix AI Cognitive & RAG Client SDK
 */

import { AxiosInstance } from 'axios';
import { AiContracts } from '@zentrix/contracts';

export class ZentrixAiClient {
    constructor(private readonly http: AxiosInstance) {}

    /**
     * Ingest semantic content chunks into the pgvector RAG memory database
     */
    async ingestKnowledge(request: AiContracts.IngestKnowledgeRequest): Promise<AiContracts.IngestKnowledgeResponse> {
        const response = await this.http.post<AiContracts.IngestKnowledgeResponse>('/v1/ai/knowledge/ingest', request);
        return response.data;
    }
}
