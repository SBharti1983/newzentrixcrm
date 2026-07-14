/**
 * AI Response Generator — Local to Digital Employee
 *
 * Lightweight Gemini wrapper used by the cognitive loop.
 * Isolated from the apps/api AI utility to avoid cross-process coupling.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@zentrix/logger';

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

/**
 * Generate an AI response using Gemini Flash (optimized for speed).
 *
 * @param prompt  - The full prompt string
 * @param isJson  - If true, parse the response as JSON
 * @returns       - The AI response (string or parsed JSON object)
 */
export async function generateAIResponse(
    prompt: string,
    isJson: boolean = true
): Promise<any> {
    const aiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!aiKey) {
        logger.warn('[AI] GEMINI_API_KEY not set — returning fallback');
        return getFallback(isJson);
    }

    const localGenAI = new GoogleGenerativeAI(aiKey);

    try {
        // Use gemini-2.0-flash for lowest latency Track A responses
        const model = localGenAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: isJson ? 0.3 : 0.7,
                maxOutputTokens: isJson ? 1024 : 512,
                ...(isJson ? { responseMimeType: 'application/json' } : {}),
            },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (isJson) {
            // Strip markdown fences if present
            const cleaned = text
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();
            return JSON.parse(cleaned);
        }

        return text.trim();
    } catch (err: any) {
        logger.error(`[AI] Gemini call failed: ${err.message}`);
        return getFallback(isJson);
    }
}

function getFallback(isJson: boolean): any {
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
