import { LLMProvider } from '../LLMProvider';
import { GeminiClient } from '../providers/GeminiClient';
import { OpenAIClient } from '../providers/OpenAIClient';
import { OllamaClient } from '../providers/OllamaClient';
import { QwenClient } from '../providers/QwenClient';
import { GroqClient } from '../providers/GroqClient';
import { logger } from '@zentrix/logger';

export type TaskType = 'fast' | 'reasoning' | 'planning';

export class ModelRouter {
    private static ollamaQwenProvider = new OllamaClient('qwen2.5'); // local Qwen via Ollama
    private static geminiFlashProvider = new GeminiClient('gemini-2.0-flash');
    private static geminiProProvider = new GeminiClient('gemini-1.5-pro');
    private static openAIGpt4Provider = new OpenAIClient('gpt-4o');
    private static openAIGpt4MiniProvider = new OpenAIClient('gpt-4o-mini');
    private static openAIO1MiniProvider = new OpenAIClient('o1-mini');
    private static qwenCloudProvider = new QwenClient('qwen-turbo');
    private static groqFastProvider = new GroqClient('llama-3.1-8b-instant');
    private static groqReasoningProvider = new GroqClient('llama-3.3-70b-versatile');

    /**
     * Get the ordered list of providers (primary, fallback, etc.) for a task.
     */
    static getProviders(task: TaskType): LLMProvider[] {
        const providers: LLMProvider[] = [];

        if (task === 'fast') {
            // Primary: Groq Fast if key exists
            if (process.env.GROQ_API_KEY) {
                providers.push(this.groqFastProvider);
            }
            // Secondary: Local Qwen (via Ollama)
            providers.push(this.ollamaQwenProvider);
            // Tertiary: Gemini Flash
            providers.push(this.geminiFlashProvider);
            // Quaternary: OpenAI GPT-4o-mini (if API Key is configured)
            if (process.env.OPENAI_API_KEY) {
                providers.push(this.openAIGpt4MiniProvider);
            }
            // Quinary: Qwen Cloud (if DashScope API key is configured)
            if (process.env.DASHSCOPE_API_KEY) {
                providers.push(this.qwenCloudProvider);
            }
        } else if (task === 'reasoning') {
            // Primary: Groq Reasoning if key exists
            if (process.env.GROQ_API_KEY) {
                providers.push(this.groqReasoningProvider);
            }
            // Secondary: OpenAI GPT-4o if key exists, otherwise Gemini Pro
            if (process.env.OPENAI_API_KEY) {
                providers.push(this.openAIGpt4Provider);
                providers.push(this.geminiProProvider);
            } else {
                providers.push(this.geminiProProvider);
            }
        } else if (task === 'planning') {
            // Primary: Groq Reasoning if key exists
            if (process.env.GROQ_API_KEY) {
                providers.push(this.groqReasoningProvider);
            }
            // Secondary: OpenAI o1-mini if key exists, otherwise Gemini Pro
            if (process.env.OPENAI_API_KEY) {
                providers.push(this.openAIO1MiniProvider);
                providers.push(this.geminiProProvider);
            } else {
                providers.push(this.geminiProProvider);
            }
        }

        // Ensure we always have at least one fallback provider
        if (providers.length === 0) {
            providers.push(this.geminiFlashProvider);
        }
        return providers;
    }

    /**
     * Get primary provider for backwards-compatibility.
     */
    static getProvider(task: TaskType): LLMProvider {
        return this.getProviders(task)[0];
    }

    static async generateResponse(
        prompt: string,
        isJson: boolean = true,
        task: TaskType = 'fast'
    ): Promise<any> {
        const providers = this.getProviders(task);
        let lastError: Error | null = null;

        for (const provider of providers) {
            try {
                logger.info(`[ModelRouter] Attempting generation for task "${task}" with ${provider.constructor.name}...`);
                const text = await provider.generate(prompt, { isJson });

                if (isJson) {
                    const cleaned = text
                        .replace(/```json\s*/gi, '')
                        .replace(/```\s*/g, '')
                        .trim();
                    return JSON.parse(cleaned);
                }
                return text;
            } catch (error: any) {
                lastError = error;
                logger.warn(
                    `[ModelRouter] Provider ${provider.constructor.name} failed for task "${task}": ${error.message}. Trying next fallback...`
                );
            }
        }

        logger.error(
            `[ModelRouter] All providers failed for task "${task}". Last error: ${lastError?.message}. Falling back to default mock response.`
        );
        return this.getFallback(isJson);
    }

    static async *generateResponseStream(
        prompt: string,
        isJson: boolean = false,
        task: TaskType = 'fast'
    ): AsyncGenerator<string, void, unknown> {
        const providers = this.getProviders(task);
        let lastError: Error | null = null;

        for (const provider of providers) {
            try {
                if (provider.generateStream) {
                    logger.info(`[ModelRouter] Attempting stream generation for task "${task}" with ${provider.constructor.name}...`);
                    const stream = provider.generateStream(prompt, { isJson });
                    for await (const chunk of stream) {
                        yield chunk;
                    }
                    return;
                } else {
                    logger.warn(`[ModelRouter] Provider ${provider.constructor.name} does not support streaming, falling back to generate()`);
                    const text = await provider.generate(prompt, { isJson });
                    yield text;
                    return;
                }
            } catch (error: any) {
                lastError = error;
                logger.warn(
                    `[ModelRouter] Stream provider ${provider.constructor.name} failed for task "${task}": ${error.message}. Trying next fallback...`
                );
            }
        }

        logger.error(
            `[ModelRouter] All streaming providers failed for task "${task}". Last error: ${lastError?.message}. Falling back to default mock response.`
        );
        yield this.getFallback(isJson);
    }

    private static getFallback(isJson: boolean): any {
        if (isJson) {
            return {
                intent: 'unknown',
                emotion: 'neutral',
                emotion_score: 0,
                stage: 'awareness',
                missing_info: [],
                objection: null,
                action: 'respond',
                response: 'Main aapki help karne ke liye ready hoon.',
                crm_update: null,
                next_goal: 'qualify_and_engage',
                should_escalate: false,
                escalation_type: null,
            };
        }
        return 'Namaste! Main aapki help karne ke liye ready hoon. Aap kya janna chahte hain?';
    }
}
