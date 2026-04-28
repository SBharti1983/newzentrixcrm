require('dotenv').config();
const axios = require('axios');

async function testWhapi() {
    const token = process.env.WHAPI_TOKEN;
    const apiUrl = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
    
    console.log('--- Whapi Diagnostic ---');
    console.log(`URL: ${apiUrl}`);
    console.log(`Token: ${token ? token.slice(0, 5) + '...' : 'MISSING'}`);

    if (!token) {
        console.error('❌ Error: WHAPI_TOKEN is missing in .env');
        return;
    }

    try {
        console.log('\n1. Testing Health/Settings...');
        const health = await axios.get(`${apiUrl}/health`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Health check success:', health.status);

        console.log('\n2. Checking Channel Settings...');
        const settings = await axios.get(`${apiUrl}/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Token is valid. Channel:', settings.data.channel_id || 'Unknown');
        
        console.log('\nReady for delivery fix.');
    } catch (err) {
        if (err.response) {
            console.error(`❌ API Error (${err.response.status}):`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('❌ Connectivity Error:', err.message);
        }
    }
}

testWhapi();
