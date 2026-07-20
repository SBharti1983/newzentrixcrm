import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import https from 'https';
import http from 'http';
import CircuitBreaker from 'opossum';
import { logger } from './logger';

// Initialize Gemini with the proper official SDK
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Reusable mock fallback responses for AI failures or tripped circuit breakers.
 */
function getAIFallbackResponse(prompt: string, isJson: boolean): any {
    logger.info('⚠️ [AI FALLBACK] Activating Safe Mock Fallback Mode to prevent crash...');
    if (isJson) {
        const promptStr = prompt.toLowerCase();
        if (promptStr.includes('headline') || promptStr.includes('hook') || promptStr.includes('pitch')) {
            return {
                headline: "Zentrix Premium Residency - Luxury Living Redefined",
                hook: "Experience unmatched luxury in the city's most coveted location.",
                value_propositions: [
                    "Sleek architectural design with high-density premium amenities",
                    "Zero-maintenance smart home integration inside all flats",
                    "Flexible custom payment structures with high resale yields"
                ],
                cta: "Schedule an exclusive preview tour today!"
            };
        }
        if (promptStr.includes('briefing') || promptStr.includes('call list')) {
            return [
                { id: "1", reason: "Hot Lead: Peak buyer sentiment", action: "Call regarding custom 3BHK pricing options" },
                { id: "2", reason: "Follow-up Overdue: Site visit pending", action: "Send WhatsApp brochure for Zentrix Heights" }
            ];
        }
        return {
            message: "This is a premium fallback assistant draft. [Gemini Free Tier Quota Limit Reached]"
        };
    }
    return "Welcome to Zentrix Realty. We would love to share exclusive floorplans and payment schedules. Let's set up a quick call.";
}

/**
 * Common function to interact with Gemini
 */
const _generateAIResponse = async (prompt: string, isJson: boolean = true, customKey: string | null = null): Promise<any> => {
    const aiKey = (customKey || process.env.GEMINI_API_KEY || '').trim();
    let finalPrompt = prompt;
    if (isJson) {
        finalPrompt += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no triple backticks, just the raw JSON string.";
    }

    // Try Gemini models first
    if (aiKey) {
        const localGenAI = new GoogleGenerativeAI(aiKey);
        const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            let attempts = 0;
            const maxAttempts = 2;
            while (attempts < maxAttempts) {
                try {
                    attempts++;
                    const model = localGenAI.getGenerativeModel({ 
                        model: modelName,
                        generationConfig: { temperature: 0.7, topP: 0.8, topK: 40 },
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                        ]
                    });
                    const result = await model.generateContent(finalPrompt);
                    let text = result.response.text();
                    if (isJson) {
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) text = jsonMatch[0];
                        return { __model: `Gemini ${modelName}`, __text: JSON.parse(text) };
                    }
                    return { __model: `Gemini ${modelName}`, __text: text };
                } catch (err: any) {
                    lastError = err;
                    logger.warn(`[AI] Attempt ${attempts} with ${modelName} failed: ${err.message}`);
                    if ((err.status === 429 || err.status === 503) && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 2000));
                        continue;
                    }
                    break;
                }
            }
        }
    }

    // Fallback to Groq
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    if (groqKey) {
        logger.info('🔄 [AI FALLBACK] Gemini failed/exhausted. Falling back to Groq LLaMA...');
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: finalPrompt }],
                    temperature: 0.7,
                    max_tokens: isJson ? 1024 : 512,
                    ...(isJson ? { response_format: { type: 'json_object' } } : {})
                })
            });
            if (response.ok) {
                const resJson = (await response.json()) as any;
                let text = resJson.choices[0]?.message?.content?.trim() || '';
                if (isJson) {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) text = jsonMatch[0];
                    return { __model: 'Groq LLaMA 3.3', __text: JSON.parse(text) };
                }
                return { __model: 'Groq LLaMA 3.3', __text: text };
            } else {
                const errText = await response.text();
                logger.error(`[AI] Groq fallback failed with status ${response.status}: ${errText}`);
            }
        } catch (groqErr: any) {
            logger.error('[AI] Groq fallback execution failed:', groqErr);
        }
    }

    throw new Error('All AI models failed — no Gemini key and Groq unavailable');
};

// Instantiate the AI Circuit Breaker
const aiBreaker = new CircuitBreaker(_generateAIResponse, {
    timeout: 20000,                // 20s execution timeout
    errorThresholdPercentage: 50,  // Trip if 50% fail
    resetTimeout: 30000            // Try to close again after 30s
});

aiBreaker.fallback((...args: any[]) => {
    const prompt = args[0];
    const isJson = args[1];
    const err = args[args.length - 1];
    const promptStr = typeof prompt === 'string' ? prompt : '';
    const isJsonVal = isJson !== false;
    logger.warn(`[AI CIRCUIT BREAKER] Gemini API call bypassed (circuit breaker active): ${err?.message || 'Breaker open'}`);
    return getAIFallbackResponse(promptStr, isJsonVal);
});

// Export the wrapper function
export const generateAIResponse = (prompt: string, isJson: boolean = true, customKey: string | null = null): Promise<any> => {
    return aiBreaker.fire(prompt, isJson, customKey);
};

/**
 * Processes audio (transcription + summary)
 */
const _generateAudioTranscription = async (prompt: string, base64Audio: string, mimeType: string, isJson: boolean = true, customKey: string | null = null): Promise<any> => {
    const aiKey = customKey || process.env.GEMINI_API_KEY;
    if (!aiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    const localGenAI = new GoogleGenerativeAI(aiKey);

    let finalPrompt = prompt;
    if (isJson) {
        finalPrompt += "\n\nIMPORTANT: Return ONLY valid JSON structured as requested. No formatting tags.";
    }

    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest", "gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                const model = localGenAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { temperature: 0 }
                });
                
                const result = await model.generateContent([
                    { inlineData: { data: base64Audio, mimeType: mimeType } },
                    { text: finalPrompt }
                ]);

                const response = result.response;
                let text = response.text();

                if (isJson) {
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        logger.error(`[AI-Audio] JSON Parse Error: ${e} Raw: ${text}`);
                        throw new Error('AI returned invalid JSON');
                    }
                }
                return text;
            } catch (err: any) {
                lastError = err;
                logger.warn(`[AI-Audio] Attempt ${attempts} with ${modelName} failed: ${err.message}`);
                
                if ((err.status === 429 || err.status === 503) && attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                break;
            }
        }
    }
    throw lastError || new Error('All Gemini models failed to process audio');
};

// Instantiate the Audio Transcription Circuit Breaker
const audioBreaker = new CircuitBreaker(_generateAudioTranscription, {
    timeout: 60000,                // 60s execution timeout (audio operations can be slow)
    errorThresholdPercentage: 50,  // Trip if 50% fail
    resetTimeout: 30000            // Try to close again after 30s
});

audioBreaker.fallback((...args: any[]) => {
    const err = args[args.length - 1];
    logger.warn(`[AUDIO CIRCUIT BREAKER] Audio transcription bypassed (circuit breaker active): ${err?.message || 'Breaker open'}`);
    return "Audio transcription service is currently offline. Please try again shortly.";
});

// Export the wrapper function
export const generateAudioTranscription = (prompt: string, base64Audio: string, mimeType: string, isJson: boolean = true, customKey: string | null = null): Promise<any> => {
    return audioBreaker.fire(prompt, base64Audio, mimeType, isJson, customKey);
};

/**
 * Downloads audio from a URL (e.g. Firebase Storage) and transcribes via Gemini.
 */
export async function transcribeFromUrl(audioUrl: string, prompt: string, customKey: string | null = null): Promise<any> {
    const aiKey = customKey || process.env.GEMINI_API_KEY;
    if (!aiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('[AI] Downloading audio for inline transcription:', audioUrl);
    
    const httpModule = audioUrl.startsWith('https') ? https : http;
    
    const audioBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const request = httpModule.get(audioUrl, { timeout: 30000 }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = response.headers.location;
                const redirectModule = redirectUrl.startsWith('https') ? https : http;
                redirectModule.get(redirectUrl, { timeout: 30000 }, (res2) => {
                    res2.on('data', chunk => chunks.push(chunk));
                    res2.on('end', () => resolve(Buffer.concat(chunks)));
                    res2.on('error', reject);
                }).on('error', reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download audio: HTTP ${response.statusCode}`));
                return;
            }
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        });
        request.on('error', reject);
        request.on('timeout', () => { request.destroy(); reject(new Error('Download timeout')); });
    });

    console.log(`[AI] Audio downloaded: ${((audioBuffer as any).length / 1024).toFixed(1)} KB`);

    let mimeType = 'audio/mp4';
    if (audioUrl.includes('.wav')) mimeType = 'audio/wav';
    else if (audioUrl.includes('.mp3')) mimeType = 'audio/mpeg';
    else if (audioUrl.includes('.ogg')) mimeType = 'audio/ogg';
    else if (audioUrl.includes('.m4a')) mimeType = 'audio/mp4';

    const base64Audio = (audioBuffer as any).toString('base64');
    return generateAudioTranscription(prompt, base64Audio, mimeType, true, customKey);
}



// ... [existing code] ...

export const isAiEnabled = !!genAI;

export async function generateGLMIntelligence(messages: any[]) {
    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    return generateAIResponse(prompt, false);
}

export async function summarizeInteractionPulse(interactions: any[]) {
    const prompt = `Analyze these CRM interactions and provide a high-density intelligence summary. 
    Focus on: 1. Sentiment 2. Urgency 3. Key Objections
    
    Interactions:
    ${JSON.stringify(interactions, null, 2)}`;
    
    return generateAIResponse(`SYSTEM: You are an Elite Sales Intelligence Officer.\n\nUSER: ${prompt}`, false);
}
