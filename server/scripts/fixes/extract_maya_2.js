const https = require('https');

const options = {
  hostname: 'mayainfratech.in',
  port: 443,
  path: '/',
  method: 'GET',
  rejectUnauthorized: false,
  headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(data.substring(0, 1000));
    });
});
req.end();
