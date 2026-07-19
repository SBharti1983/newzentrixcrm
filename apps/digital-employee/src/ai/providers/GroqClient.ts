import { LLMProvider } from '../LLMProvider';
import { logger } from '@zentrix/logger';
import axios from 'axios';

export class GroqClient implements LLMProvider {
    private apiKey: string = '';
    private modelName: string;

    constructor(modelName: string = 'llama-3.3-70b-versatile') {
        this.modelName = modelName;
        this.apiKey = (process.env.GROQ_API_KEY || '').trim();
        if (!this.apiKey) {
            logger.warn(`[GroqClient] GROQ_API_KEY is not set`);
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
        if (!this.apiKey) {
            throw new Error('Groq API key is not set');
        }
        const isJson = options?.isJson ?? true;
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: this.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: options?.temperature ?? (isJson ? 0.3 : 0.7),
                max_tokens: options?.maxTokens ?? (isJson ? 1024 : 512),
                ...(isJson ? { response_format: { type: 'json_object' } } : {}),
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                signal: options?.signal,
            }
        );

        return response.data.choices[0].message.content.trim();
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
        if (!this.apiKey) {
            throw new Error('Groq API key is not set');
        }
        const isJson = options?.isJson ?? true;
        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: options?.temperature ?? (isJson ? 0.3 : 0.7),
                    max_tokens: options?.maxTokens ?? (isJson ? 1024 : 512),
                    stream: true,
                    ...(isJson ? { response_format: { type: 'json_object' } } : {}),
                }),
                signal: options?.signal,
            }
        );

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Groq stream request failed (${response.status}): ${errText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const cleanedLine = line.trim();
                    if (!cleanedLine) continue;
                    if (cleanedLine === 'data: [DONE]') continue;
                    if (cleanedLine.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(cleanedLine.substring(6));
                            const text = parsed.choices[0]?.delta?.content || '';
                            if (text) {
                                yield text;
                            }
                        } catch (e) {
                            // ignore malformed json or incomplete chunks
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
