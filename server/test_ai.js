const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { generateAIResponse } = require('./utils/ai');

async function testAI() {
    console.log('Testing AI with key:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');
    try {
        const response = await generateAIResponse('Hello, are you working?', false);
        console.log('AI Response:', response);
    } catch (err) {
        console.error('AI Test Failed:', err.message);
        if (err.response) {
            console.error('Data:', err.response.data);
        }
    }
}

testAI();
