const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini with the proper official SDK
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Common function to interact with Gemini
 * @param {string} prompt 
 * @param {boolean} isJson - Whether we expect a JSON response
 * @returns {Promise<any>}
 */
async function generateAIResponse(prompt, isJson = true, customKey = null) {
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

        // Use confirmed models for this specific API Key
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro", "gemini-2.0-flash-exp"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            let attempts = 0;
            const maxAttempts = 2; // Retry once if it's a transient error

            while (attempts < maxAttempts) {
                try {
                    attempts++;
                    const model = localGenAI.getGenerativeModel({ 
                        model: modelName,
                        generationConfig: { temperature: 0 }
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
        throw lastError;
    } catch (err) {
        console.error('[AI] Pipeline failure:', err);
        throw err;
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
async function generateAudioTranscription(prompt, base64Audio, mimeType, isJson = true, customKey = null) {
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

        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];
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
async function transcribeFromUrl(audioUrl, prompt, customKey = null) {
    const aiKey = customKey || process.env.GEMINI_API_KEY;
    if (!aiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('[AI] Downloading audio for inline transcription:', audioUrl);
    
    const https = audioUrl.startsWith('https') ? require('https') : require('http');
    
    const audioBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const request = https.get(audioUrl, { timeout: 30000 }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = response.headers.location;
                const redirectModule = redirectUrl.startsWith('https') ? require('https') : require('http');
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

    console.log(`[AI] Audio downloaded: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

    let mimeType = 'audio/mp4';
    if (audioUrl.includes('.wav')) mimeType = 'audio/wav';
    else if (audioUrl.includes('.mp3')) mimeType = 'audio/mpeg';
    else if (audioUrl.includes('.ogg')) mimeType = 'audio/ogg';
    else if (audioUrl.includes('.m4a')) mimeType = 'audio/mp4';

    const base64Audio = audioBuffer.toString('base64');
    return generateAudioTranscription(prompt, base64Audio, mimeType, true, customKey);
}



// ... [existing code] ...

module.exports = {
    generateAIResponse,
    generateAudioTranscription,
    transcribeFromUrl,
    isAiEnabled: !!genAI,
    // New high-density intelligence features powered by Gemini (replacing GLM)
    generateGLMIntelligence: async (messages) => {
        const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        return generateAIResponse(prompt, false);
    },
    summarizeInteractionPulse: async (interactions) => {
        const prompt = `Analyze these CRM interactions and provide a high-density intelligence summary. 
        Focus on: 1. Sentiment 2. Urgency 3. Key Objections
        
        Interactions:
        ${JSON.stringify(interactions, null, 2)}`;
        
        return generateAIResponse(`SYSTEM: You are an Elite Sales Intelligence Officer.\n\nUSER: ${prompt}`, false);
    }
};
