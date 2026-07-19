/**
 * LLMProvider — common interface implemented by every model client
 * (Groq, OpenAI, Gemini, Ollama, Qwen).
 *
 * `signal?: AbortSignal` is part of the options so callers (notably
 * BaseCognitiveLoop.runReasoningWithGuards and BaseVoiceAdapter barge-in)
 * can cancel an in-flight request. When the signal aborts:
 *   - axios-based `generate()` rejects with an error whose `code` is
 *     `'ERR_CANCELED'` (axios maps AbortSignal to its own cancel token).
 *   - fetch-based `generateStream()` rejects with a `DOMException` named
 *     `'AbortError'`, and any pending `reader.read()` rejects likewise.
 * Both cases are caught by ModelRouter's per-provider try/catch and
 * surface as a normal provider failure (falling through to the next
 * provider or, in the reasoning path, to the fallback reasoning).
 */
export interface LLMProvider {
    generate(
        prompt: string,
        options?: {
            isJson?: boolean;
            temperature?: number;
            maxTokens?: number;
            signal?: AbortSignal;
        }
    ): Promise<string>;

    generateStream?(
        prompt: string,
        options?: {
            isJson?: boolean;
            temperature?: number;
            maxTokens?: number;
            signal?: AbortSignal;
        }
    ): AsyncGenerator<string, void, unknown>;
}
