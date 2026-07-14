const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../server/.env' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // We can't actually list models without a valid key, so this validates the key too.
        console.log('--- Attempting to connect to Gemini ---');
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hi");
        console.log('Success!');
    } catch (err) {
        console.error('Connection Failed:', err.message);
    }
    process.exit();
}

listModels();
