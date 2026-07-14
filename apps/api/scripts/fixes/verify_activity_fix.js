const axios = require('axios');
const fs = require('fs');

async function testAgentActivity() {
    try {
        console.log('Logging in...');
        const loginResp = await axios.post('http://localhost:5050/api/auth/login', {
            email: 'demoadmin@zentrix.com',
            password: 'Test@1234'
        });
        const token = loginResp.data.accessToken;
        console.log('Login successful.');

        console.log('Fetching agent activity...');
        const activityResp = await axios.get('http://localhost:5050/api/telephony/agent-activity', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('SUCCESS: Agent activity fetched.');
        console.log('Data:', JSON.stringify(activityResp.data.slice(0, 2), null, 2));
    } catch (err) {
        console.error('FAILED:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testAgentActivity();
