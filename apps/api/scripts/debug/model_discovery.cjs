const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../server/.env' });

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using Key:', apiKey);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // List models is not a direct method on genAI, we use retrieveModel or similar
        // Or just try specific ones.
        
        console.log('--- Testing model connections ---');
        
        // Try the NEW GA models
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-2.0-flash-exp",
            "gemini-1.0-pro"
        ];

        for (const m of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hi");
                console.log(`✅ ${m}: SUCCESS`);
                console.log('Response:', (await result.response).text());
                process.exit(0);
            } catch (e) {
                console.log(`❌ ${m}: FAIL - ${e.message}`);
            }
        }
    } catch (err) {
        console.error('Fatal Error:', err);
    }
    process.exit(1);
}

checkModels();
