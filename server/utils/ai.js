const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini with the proper client library
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

/**
 * Common function to interact with Gemini
 * @param {string} prompt 
 * @param {boolean} isJson - Whether we expect a JSON response
 * @returns {Promise<any>}
 */
async function generateAIResponse(prompt, isJson = true) {
    if (!genAI) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    try {
        let finalPrompt = prompt;
        if (isJson) {
            finalPrompt += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no triple backticks, just the raw JSON string.";
        }

        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
        });

        const text = response.text;

        if (isJson) {
            try {
                // Strip potential markdown markers if AI ignores instructions
                let cleaned = text.trim();
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```json/i, '').replace(/```$/i, '').trim();
                }
                return JSON.parse(cleaned);
            } catch (_e) {
                console.error("Failed to parse AI JSON:", text);
                throw new Error("AI returned invalid JSON format");
            }
        }
        return text;
    } catch (err) {
        console.error("AI Generation Error:", err);
        throw err;
    }
}

async function generateAudioTranscription(prompt, base64Audio, mimeType = 'audio/wav', isJson = true) {
    if (!genAI) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    try {
        let finalPrompt = prompt;
        if (isJson) {
            finalPrompt += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no triple backticks, just the raw JSON string.";
        }

        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Audio, mimeType: mimeType } },
                        { text: finalPrompt }
                    ]
                }
            ]
        });

        const text = response.text;

        if (isJson) {
            try {
                let cleaned = text.trim();
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```json/i, '').replace(/```$/i, '').trim();
                }
                return JSON.parse(cleaned);
            } catch (_e) {
                console.error("Failed to parse AI JSON:", text);
                throw new Error("AI returned invalid JSON format");
            }
        }
        return text;
    } catch (err) {
        console.error("AI Transcription Error:", err);
        throw err;
    }
}

module.exports = {
    generateAIResponse,
    generateAudioTranscription,
    isAiEnabled: !!genAI
};
