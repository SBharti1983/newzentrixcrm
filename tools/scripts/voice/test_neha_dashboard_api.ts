import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../apps/api/.env') });

async function run() {
    console.log('Logging in as admin@mayainfratech.in...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
        email: 'admin@mayainfratech.in',
        password: 'Maya@2026'
    });

    const token = loginRes.data.accessToken;
    console.log('Login successful! Token acquired.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\nFetching /neha/dashboard/stats...');
    const statsRes = await axios.get('http://localhost:4000/api/v1/neha/dashboard/stats?days=7', { headers });
    console.log('Stats Response:', JSON.stringify(statsRes.data, null, 2));

    console.log('\nFetching /neha/dashboard/filings...');
    const filingsRes = await axios.get('http://localhost:4000/api/v1/neha/dashboard/filings?limit=50', { headers });
    console.log('Filings count:', filingsRes.data.total);

    console.log('\nFetching /neha/dashboard/reasoning-feed...');
    const reasoningRes = await axios.get('http://localhost:4000/api/v1/neha/dashboard/reasoning-feed?limit=10', { headers });
    console.log('Reasoning feed count:', reasoningRes.data.count);

    process.exit(0);
}

run().catch(err => {
    console.error('API fetch failed:', err.response?.data || err.message);
    process.exit(1);
});
