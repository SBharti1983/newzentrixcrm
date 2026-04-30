const https = require('https');
require('dotenv').config({ path: '../server/.env' });

const apiKey = process.env.GEMINI_API_KEY;

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: `/v1/models?key=${apiKey}`,
  method: 'GET'
};

console.log('Listing Models...');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    const json = JSON.parse(body);
    console.log('Available Models:', json.models ? json.models.map(m => m.name) : 'NONE');
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end();
