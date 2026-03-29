const https = require('https');

https.get('https://logo.clearbit.com/mayainfratech.in', (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers['content-type']);
});
