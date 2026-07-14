const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPro() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const res = await model.generateContent("Hello?");
        console.log('Gemini 2.5 Pro WORKING:', res.response.text());
    } catch (err) {
        console.log('Gemini 2.5 Pro FAILED:', err.message);
    }
}

testPro();
