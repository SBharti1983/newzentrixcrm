import { logger } from '@zentrix/logger';
import { RohanContext, ChannelType } from '@zentrix/types';
import {
    getEmbedding,
    querySimilarity,
    initializeConversationVectorStore,
    storeConversationTurn,
    retrieveSimilarConversations,
} from '@zentrix/rag';
import { CircuitBreaker } from './CircuitBreaker';

export class VectorMemory {
    private storeReady = false;
    private breaker = new CircuitBreaker('pgvector', 4, 60_000);

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        try {
            await initializeConversationVectorStore();
            this.storeReady = true;
            logger.info('[VectorMemory] pgvector conversation store ready — Tier 3 active');
        } catch (err: any) {
            logger.warn(`[VectorMemory] Vector store init failed: ${err.message}`);
            this.storeReady = false;
        }
    }

    get isReady(): boolean {
        return this.storeReady;
    }

    get isBreakerOpen(): boolean {
        return this.breaker.isOpen;
    }

    async storeTurn(
        tenantId: number,
        leadId: string,
        personaId: string,
        channel: ChannelType,
        turnNumber: number,
        content: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        if (this.storeReady && this.breaker.allow()) {
            try {
                await storeConversationTurn({
                    tenantId,
                    leadId,
                    personaId,
                    channel,
                    turnNumber,
                    content,
                    metadata,
                });
                this.breaker.recordSuccess();
            } catch (err: any) {
                this.breaker.recordFailure();
                logger.warn(`[VectorMemory] Turn embedding store failed: ${err.message}`);
                throw err;
            }
        }
    }

    async retrieveSimilar(
        tenantId: number,
        userQuery: string,
        leadId: string
    ): Promise<NonNullable<RohanContext['semantic_memories']>> {
        if (!this.storeReady || !this.breaker.allow()) return [];

        try {
            const queryEmbedding = await getEmbedding(userQuery);

            const [personal, crossLead, knowledge] = await Promise.all([
                retrieveSimilarConversations(tenantId, queryEmbedding, {
                    limit: 3,
                    minSimilarity: 0.6,
                    scopeLeadId: leadId,
                }),
                retrieveSimilarConversations(tenantId, queryEmbedding, {
                    limit: 2,
                    minSimilarity: 0.7,
                }),
                querySimilarity(tenantId, queryEmbedding, 3, 0.65),
            ]);

            this.breaker.recordSuccess();

            return [
                ...personal.map(r => ({
                    content: `[prior turn] ${r.content}`,
                    score: r.similarity,
                    metadata: { source: 'conversation:personal', ...r.metadata, lead_id: r.leadId },
                })),
                ...crossLead.map(r => ({
                    content: `[similar lead] ${r.content}`,
                    score: r.similarity,
                    metadata: { source: 'conversation:cross-lead', ...r.metadata, lead_id: r.leadId },
                })),
                ...knowledge.map(r => ({
                    content: r.textContent,
                    score: r.similarity,
                    metadata: { source: 'knowledge', document: r.documentName, ...r.metadata },
                })),
            ];
        } catch (err: any) {
            this.breaker.recordFailure();
            logger.warn(`[VectorMemory] pgvector search failed: ${err.message}`);
            throw err;
        }
    }
}
