/**
 * Generate secure random secrets for JWT and Refresh tokens.
 * Run: node scripts/generate-secrets.js
 * Then paste the output into your .env file.
 */
const crypto = require('crypto');

const jwtSecret = crypto.randomBytes(48).toString('base64');
const refreshSecret = crypto.randomBytes(48).toString('base64');

console.log('\n🔑 Generated Secrets — paste these into your .env:\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`REFRESH_TOKEN_SECRET=${refreshSecret}`);
console.log('\n⚠️  Never commit these to version control!\n');
