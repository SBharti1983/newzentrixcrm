const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../server/.env' });

async function verifyKey() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY is missing from .env');
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
        let success = false;
        
        console.log('--- Verifying Gemini API Key ---');
        
        for (const modelName of modelsToTry) {
            try {
                console.log(`Checking model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Respond with 'OK'");
                const response = await result.response;
                console.log(`✅ Model ${modelName}: VALID`);
                console.log('AI Response:', response.text());
                success = true;
                break;
            } catch (e) {
                console.warn(`⚠️ Model ${modelName} failed: ${e.message}`);
            }
        }

        if (success) {
            console.log('\n✅ Overall License Status: ACTIVE');
        } else {
            console.error('\n❌ Status: INVALID');
            console.error('Reason: All tested models failed. This usually means the API Key is invalid or restricted.');
        }
    } catch (err) {
        console.error('❌ Status: INVALID');
        console.error('Reason:', err.message);
        if (err.message.includes('API_KEY_INVALID')) {
            console.error('Suggestion: The key exists but is incorrect or expired.');
        }
    }
    process.exit();
}

verifyKey();
