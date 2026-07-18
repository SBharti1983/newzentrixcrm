export interface LLMProvider {
    generate(
        prompt: string,
        options?: {
            isJson?: boolean;
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<string>;

    generateStream?(
        prompt: string,
        options?: {
            isJson?: boolean;
            temperature?: number;
            maxTokens?: number;
        }
    ): AsyncGenerator<string, void, unknown>;
}

