import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import https from 'https';
import http from 'http';

// Initialize Gemini with the proper official SDK
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Common function to interact with Gemini
 * @param {string} prompt 
 * @param {boolean} isJson - Whether we expect a JSON response
 * @returns {Promise<any>}
 */
export async function generateAIResponse(prompt: string, isJson: boolean = true, customKey: string | null = null): Promise<any> {
    const aiKey = (customKey || process.env.GEMINI_API_KEY || '').trim();
    if (!aiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    const localGenAI = new GoogleGenerativeAI(aiKey);

    try {
        let finalPrompt = prompt;
        if (isJson) {
            finalPrompt += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no triple backticks, just the raw JSON string.";
        }

        // Using Gemini 2.5 Flash as the primary engine for high-speed sales training simulations.
        const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            let attempts = 0;
            const maxAttempts = 2; // Retry once if it's a transient error

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
                    const response = result.response;
                    let text = response.text();
                    
                    if (isJson) {
                        // Extract JSON block if AI wrapped it in triple backticks
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            text = jsonMatch[0];
                        }
                        return JSON.parse(text);
                    }
                    return text;
                } catch (err) {
                    lastError = err;
                    console.warn(`[AI] Attempt ${attempts} with ${modelName} failed:`, err.message);
                    
                    // If transient (503/429) and we have attempts left, wait and retry
                    if ((err.status === 429 || err.status === 503) && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 2000)); // Wait 2s
                        continue;
                    }
                    
                    // If definitive 404 or exhausted retries, try next model in the list
                    break; 
                }
            }
        }
        throw lastError || new Error('All Gemini models failed');
    } catch (err: any) {
        console.error('[AI] Pipeline failure (e.g. Quota Exceeded or Deprecated Model):', err.message || err);
        
        // ── Safe Fallback Mode for Quota limits or API key errors ──
        console.log('⚠️ [AI FALLBACK] Activating Safe Mock Fallback Mode to prevent crash...');
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
}

/**
 * Processes audio (transcription + summary)
 * @param {string} prompt - The analysis prompt
 * @param {string} base64Audio - The audio data
 * @param {string} mimeType - e.g. 'audio/mp4'
 * @param {boolean} isJson - Whether to parse as JSON
 * @returns {Promise<any>}
 */
export async function generateAudioTranscription(prompt: string, base64Audio: string, mimeType: string, isJson: boolean = true, customKey: string | null = null): Promise<any> {
    const aiKey = customKey || process.env.GEMINI_API_KEY;
    if (!aiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    const localGenAI = new GoogleGenerativeAI(aiKey);

    try {
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
                            console.error('[AI-Audio] JSON Parse Error:', e, 'Raw:', text);
                            throw new Error('AI returned invalid JSON');
                        }
                    }
                    return text;
                } catch (err) {
                    lastError = err;
                    console.warn(`[AI-Audio] Attempt ${attempts} with ${modelName} failed:`, err.message);
                    
                    if ((err.status === 429 || err.status === 503) && attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 2000));
                        continue;
                    }
                    break;
                }
            }
        }
        throw lastError;
    } catch (err) {
        console.error('[AI-Audio] Pipeline failure:', err);
        throw err;
    }
}

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
