const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { generateAIResponse } = require('./utils/ai');

async function testCopilotCall() {
    const projectsContext = "[]"; // Empty projects for test
    const query = "objection handling for high price";
    const prompt = `
You are the Zentrix AI Sales Co-Pilot, an elite real estate sales assistant embedded directly in the CRM.
Context - Available Real Estate Inventory for this tenant:
${projectsContext}

Agent's Query: "${query}"

Generate the Co-Pilot's response:
`;
    try {
        console.log('Testing AI for Copilot prompt...');
        const res = await generateAIResponse(prompt, false);
        console.log('AI Response Success:', res.substring(0, 100));
    } catch (err) {
        console.error('AI Response FAILED:', err.message);
    }
}

testCopilotCall();
