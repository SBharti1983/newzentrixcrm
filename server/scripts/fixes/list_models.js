const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        console.log('Listing available models...');
        // Note: The SDK might not have a direct listModels, we might need to use fetch
        // Actually, let's try just the common defaults first
        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const res = await model.generateContent("test");
                console.log(`Model ${m}: WORKING`);
            } catch (err) {
                console.log(`Model ${m}: FAILED - ${err.message}`);
            }
        }
    } catch (err) {
        console.error('List Failed:', err);
    }
}

listModels();
