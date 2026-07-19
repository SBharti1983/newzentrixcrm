import { LLMProvider } from '../LLMProvider';
import { logger } from '@zentrix/logger';
import axios from 'axios';

export class OllamaClient implements LLMProvider {
    private baseUrl: string;
    private modelName: string;

    constructor(modelName: string = 'llama3', baseUrl: string = 'http://localhost:11434') {
        this.modelName = modelName;
        this.baseUrl = (process.env.OLLAMA_BASE_URL || baseUrl).trim();
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
        const isJson = options?.isJson ?? true;
        const response = await axios.post(
            `${this.baseUrl}/api/chat`,
            {
                model: this.modelName,
                messages: [{ role: 'user', content: prompt }],
                options: {
                    temperature: options?.temperature ?? (isJson ? 0.3 : 0.7),
                    num_predict: options?.maxTokens ?? (isJson ? 1024 : 512),
                },
                stream: false,
                ...(isJson ? { format: 'json' } : {})
            },
            {
                signal: options?.signal
            }
        );

        return response.data.message.content.trim();
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
        const isJson = options?.isJson ?? true;
        const response = await fetch(
            `${this.baseUrl}/api/chat`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [{ role: 'user', content: prompt }],
                    options: {
                        temperature: options?.temperature ?? (isJson ? 0.3 : 0.7),
                        num_predict: options?.maxTokens ?? (isJson ? 1024 : 512),
                    },
                    stream: true,
                    ...(isJson ? { format: 'json' } : {})
                }),
                signal: options?.signal
            }
        );

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Ollama stream request failed (${response.status}): ${errText}`);
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
                    try {
                        const parsed = JSON.parse(cleanedLine);
                        const text = parsed.message?.content || '';
                        if (text) {
                            yield text;
                        }
                    } catch (e) {
                        // ignore malformed json or incomplete chunks
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
