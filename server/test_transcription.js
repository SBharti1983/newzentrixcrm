require('dotenv').config({ path: __dirname + '/.env' });
const aiService = require('./services/aiService');
const testAudioUrl = 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3';

async function runTest() {
    try {
        console.log("Starting test...");
        const result = await aiService.transcribeCall(testAudioUrl);
        console.log("Transcription result keys:", Object.keys(result));
        console.log("Transcription analysis start:", result.fullAnalysis.substring(0, 100));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();
