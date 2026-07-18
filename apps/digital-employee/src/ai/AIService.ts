import { ModelRouter } from './routing/ModelRouter';

/**
 * Generate an AI response using the routed model (defaults to fast/Gemini Flash).
 * Consolidated inside src/ai/AIService.ts.
 *
 * @param prompt  - The full prompt string
 * @param isJson  - If true, parse the response as JSON
 * @returns       - The AI response (string or parsed JSON object)
 */
export async function generateAIResponse(
    prompt: string,
    isJson: boolean = true
): Promise<any> {
    return ModelRouter.generateResponse(prompt, isJson, 'fast');
}

export function generateAIResponseStream(
    prompt: string,
    isJson: boolean = false
): AsyncGenerator<string, void, unknown> {
    return ModelRouter.generateResponseStream(prompt, isJson, 'fast');
}
