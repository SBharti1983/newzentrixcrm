import { getEmbedding } from '@zentrix/rag';

export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
}

export class DefaultEmbeddingProvider implements EmbeddingProvider {
    async embed(text: string): Promise<number[]> {
        return getEmbedding(text);
    }
}
