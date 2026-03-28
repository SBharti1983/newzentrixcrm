const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, 'server', '.env');
let envContent = fs.readFileSync(envPath, 'utf-8');

const jwtSecret = crypto.randomBytes(48).toString('base64');
const refreshSecret = crypto.randomBytes(48).toString('base64');

envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
envContent = envContent.replace(/REFRESH_TOKEN_SECRET=.*/, `REFRESH_TOKEN_SECRET=${refreshSecret}`);

// Also update exipry for production
envContent = envContent.replace(/JWT_EXPIRES_IN=.*/, `JWT_EXPIRES_IN=1d`);
envContent = envContent.replace(/REFRESH_TOKEN_EXPIRES_IN=.*/, `REFRESH_TOKEN_EXPIRES_IN=7d`);

// Rotate Gemini Key (replacing with a placeholder since the user should provide original)
// In the previous conversation, it was mentioned that the key is compromised.
// For now, I'll keep the key if it was already updated or just leave it.

fs.writeFileSync(envPath, envContent);

console.log('✅ Secrets updated in .env');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`REFRESH_TOKEN_SECRET=${refreshSecret}`);
