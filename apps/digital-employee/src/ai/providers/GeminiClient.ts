import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from '../LLMProvider';
import { logger } from '@zentrix/logger';

export class GeminiClient implements LLMProvider {
    private genAI: GoogleGenerativeAI | null = null;
    private modelName: string;

    constructor(modelName: string = 'gemini-2.0-flash') {
        this.modelName = modelName;
        const key = (process.env.GEMINI_API_KEY || '').trim();
        if (key) {
            this.genAI = new GoogleGenerativeAI(key);
        } else {
            logger.warn(`[GeminiClient] GEMINI_API_KEY is not set`);
        }
    }

    async generate(
        prompt: string,
        options?: {
            isJson?: boolean;
            temperature?: number;
            maxTokens?: number;
            signal?: AbortSignal;
        }
    ): Promise<string> {
        if (!this.genAI) {
            throw new Error('Gemini API key is not set');
        }
        const isJson = options?.isJson ?? true;
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: options?.temperature ?? (isJson ? 0.3 : 0.7),
                maxOutputTokens: options?.maxTokens ?? (isJson ? 1024 : 512),
                ...(isJson ? { responseMimeType: 'application/json' } : {}),
            },
        });

        const result = await model.generateContent(prompt, {
            signal: options?.signal
        });
        return result.response.text().trim();
    }

    async *generateStream(
        prompt: string,
        options?: {
            isJson?: boolean;
            temperature?: number;
            maxTokens?: number;
            signal?: AbortSignal;
        }
    ): AsyncGenerator<string, void, unknown> {
        if (!this.genAI) {
            throw new Error('Gemini API key is not set');
        }
        const isJson = options?.isJson ?? true;
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: options?.temperature ?? (isJson ? 0.3 : 0.7),
                maxOutputTokens: options?.maxTokens ?? (isJson ? 1024 : 512),
                ...(isJson ? { responseMimeType: 'application/json' } : {}),
            },
        });

        const result = await model.generateContentStream(prompt, {
            signal: options?.signal
        });
        for await (const chunk of result.stream) {
            yield chunk.text();
        }
    }
}
