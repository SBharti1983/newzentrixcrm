const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkApiKey() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
            console.error('API Key Error:', data.error.message);
        } else {
            console.log('Available Models:', data.models.map(m => m.name));
        }
    } catch (err) {
        console.error('Fetch Failed:', err.message);
    }
}

checkApiKey();
