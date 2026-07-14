const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: 5050, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
        }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, data: d }); } }); });
        req.on('error', reject); req.write(data); req.end();
    });
}

async function test() {
    console.log('=== 1. LOGIN TEST ===');
    const login = await post('/api/auth/login', { email: 'admin@mayainfratech.in', password: 'Maya@2026' });
    console.log('Login:', login.status, login.data.user ? 'SUCCESS - ' + login.data.user.name : 'FAILED');
    const token = login.data.accessToken || login.data.token;
    if (!token) { console.log('No token found. Keys:', Object.keys(login.data)); return; }

    function get(path) {
        return new Promise((resolve, reject) => {
            http.get({ hostname: 'localhost', port: 5050, path, headers: { Authorization: 'Bearer ' + token } },
                res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, data: d }); } }); }).on('error', reject);
        });
    }
    function postAuth(path, body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const req = http.request({ hostname: 'localhost', port: 5050, path, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, Authorization: 'Bearer ' + token }
            }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, data: d }); } }); });
            req.on('error', reject); req.write(data); req.end();
        });
    }

    console.log('\n=== 2. DASHBOARD ===');
    const dash = await get('/api/dashboard?personal=false');
    console.log('Dashboard:', dash.status, dash.data.error ? 'ERROR: ' + dash.data.error : 'OK');

    console.log('\n=== 3. LEADS LIST ===');
    const leads = await get('/api/leads?limit=5');
    console.log('Leads:', leads.status, leads.data.error ? 'ERROR: ' + leads.data.error : 'OK - total: ' + leads.data.total);

    console.log('\n=== 4. ADD LEAD ===');
    const newLead = await postAuth('/api/leads', { name: 'Test Lead ' + Date.now(), phone: '999' + Math.floor(Math.random()*10000000), source: 'Website', stage: 'New Lead', status: 'Active' });
    console.log('Add Lead:', newLead.status, newLead.data.error ? 'ERROR: ' + newLead.data.error : 'SUCCESS - ' + newLead.data.id);

    console.log('\n=== 5. USERS ===');
    const users = await get('/api/users');
    console.log('Users:', users.status, Array.isArray(users.data) ? 'OK - count: ' + users.data.length : 'ERROR');

    console.log('\n=== 6. BULK REASSIGN ===');
    if (leads.data.data?.length > 0 && Array.isArray(users.data) && users.data.length > 0) {
        const leadId = leads.data.data[0].id;
        const agentId = users.data.find(u => u.role === 'agent')?.id || users.data[0].id;
        const bulk = await postAuth('/api/leads/bulk-update', { leadIds: [leadId], updates: { assigned_to: agentId } });
        console.log('Bulk Reassign:', bulk.status, JSON.stringify(bulk.data));
    } else { console.log('SKIP'); }

    console.log('\n=== 7. FOLLOWUPS ===');
    const fu = await get('/api/followups?limit=5');
    console.log('Followups:', fu.status, Array.isArray(fu.data) ? 'OK - count: ' + fu.data.length : fu.data.error || 'ERROR');

    console.log('\n=== 8. PROJECTS ===');
    const proj = await get('/api/projects?status=Active');
    console.log('Projects:', proj.status, Array.isArray(proj.data) ? 'OK - count: ' + proj.data.length : 'ERROR');

    console.log('\n=== ALL TESTS COMPLETE ===');
}

test().catch(e => console.error('Test failed:', e.message));
