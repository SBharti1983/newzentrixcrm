const axios = require('axios');

async function test() {
    const l = await axios.post('http://localhost:5050/api/auth/login', {
        email: 'demoadmin@zentrix.com', password: 'Test@1234'
    });
    const t = l.data.accessToken;
    
    const r = await axios.get('http://localhost:5050/api/leads?limit=1', {
        headers: { Authorization: 'Bearer ' + t }
    });
    const leadId = r.data.data[0].id;
    console.log('Lead:', r.data.data[0].name, leadId);
    
    const d = await axios.get('http://localhost:5050/api/leads/' + leadId, {
        headers: { Authorization: 'Bearer ' + t }
    });
    const ints = d.data.interactions || [];
    console.log('Interactions:', ints.length);
    
    if (ints.length > 0) {
        const iid = ints[0].id;
        console.log('Testing transcript download for interaction:', iid);
        const tr = await axios.get('http://localhost:5050/api/telephony/transcript/' + iid, {
            headers: { Authorization: 'Bearer ' + t },
            responseType: 'text'
        });
        console.log('✅ Status:', tr.status);
        console.log('Content-Disposition:', tr.headers['content-disposition']);
        console.log('\n--- TRANSCRIPT FILE PREVIEW ---');
        console.log(tr.data.substring(0, 600));
    } else {
        console.log('No interactions on this lead, testing 404...');
        try {
            await axios.get('http://localhost:5050/api/telephony/transcript/00000000-0000-0000-0000-000000000000', {
                headers: { Authorization: 'Bearer ' + t }
            });
        } catch (e) {
            console.log('Expected 404:', e.response?.data);
        }
    }
}

test().catch(e => console.error('ERROR:', e.response?.data || e.message));
