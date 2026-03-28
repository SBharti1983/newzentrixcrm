const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(48).toString('base64');
const refreshSecret = crypto.randomBytes(48).toString('base64');
console.log('---BEGIN---');
console.log('JWT_SECRET=' + jwtSecret);
console.log('REFRESH_TOKEN_SECRET=' + refreshSecret);
console.log('---END---');
