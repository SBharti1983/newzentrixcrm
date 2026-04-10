const http = require('http');

async function testApi() {
    try {
        const fetch = global.fetch;
        
        // 1. Login to get valid token
        const res1 = await fetch('http://localhost:5050/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'rohan.m@zentrix.com', password: 'password123' }) // We see Rohan in db_agents
        });
        const loginData = await res1.json();
        if (!loginData.accessToken) {
            console.log("Login failed"); process.exit(0);
        }
        
        console.log("Logged in");
        
        // 2. Do PATCH request
        const payload = {
            name: 'Rohan Mishra',
            email: 'rohan.m@zentrix.com',
            role: 'agent',
            telephony_agent_id: 'REAL_AGENT_1'
        };
        const res2 = await fetch(`http://localhost:5050/api/users/${loginData.user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.accessToken}`
            },
            body: JSON.stringify(payload)
        });
        
        const updateData = await res2.json();
        console.log("PATCH output:", updateData);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
testApi();
