const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testLite() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const res = await model.generateContent("Hello?");
        console.log('Gemini 2.0 Flash Lite WORKING:', res.response.text());
    } catch (err) {
        console.log('Gemini 2.0 Flash Lite FAILED:', err.message);
    }
}

testLite();
