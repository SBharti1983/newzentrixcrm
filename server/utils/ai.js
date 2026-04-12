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
    const aiKey = customKey || process.env.GEMINI_API_KEY;
    if (!aiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    const localGenAI = new GoogleGenerativeAI(aiKey);

    try {
        let finalPrompt = prompt;
        if (isJson) {
            finalPrompt += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no triple backticks, just the raw JSON string.";
        }

        // Use standard models available for this API key
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const model = localGenAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { temperature: 0 }
                });
                const result = await model.generateContent(finalPrompt);
                const response = result.response;
                let text = response.text();
                
                if (isJson) {
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(text);
                }
                return text;
            } catch (err) {
                lastError = err;
                console.warn(`[AI] Attempt with ${modelName} failed:`, err.message);
                if (err.status === 404) continue; // Model not found, try next
                if (err.status === 429 || err.status === 503) continue; // Quota hit, try next
                throw err; // Real error
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

        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
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
                    console.log('[AI-Audio] Raw AI response (first 500 chars):', text.substring(0, 500));
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.error("[AI] JSON Parse failed, raw text:", text);
                        throw e;
                    }
                }
                return text;
            } catch (err) {
                lastError = err;
                console.warn(`[AI-Audio] Attempt with ${modelName} failed:`, err.message);
                if (err.status === 404) continue;
                if (err.status === 429 || err.status === 503) continue;
                throw err;
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

module.exports = {
    generateAIResponse,
    generateAudioTranscription,
    transcribeFromUrl,
    isAiEnabled: !!genAI
};
