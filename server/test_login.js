const fetch = require('node-fetch');

async function testLogin(email, password) {
    try {
        const res = await fetch('http://localhost:5050/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(data);
    } catch (e) {
        console.error(e);
    }
}

testLogin('arjun@zentrix.com', 'Admin@123');
testLogin('admin@mayainfratech.in', 'Maya@123');
