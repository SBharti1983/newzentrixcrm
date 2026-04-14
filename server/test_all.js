const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAllAvailable() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-001',
        'gemini-2.0-flash-lite-001',
        'gemini-1.5-flash'
    ];
    for (const modelName of models) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const res = await model.generateContent("test");
            console.log(`${modelName} WORKS!`);
            process.exit(0);
        } catch (err) {
            console.log(`${modelName} FAILED: ${err.message}`);
        }
    }
}

testAllAvailable();
