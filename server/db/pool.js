const { Pool } = require('pg');
const config = require('../config/secrets');

let connectionString = config.database.connectionString;
let sslConfig = config.database.ssl;

const isProduction = process.env.NODE_ENV === 'production';

if (connectionString && (connectionString.includes('supabase.co') || connectionString.includes('supabase.com'))) {
    // Supabase ALWAYS requires SSL — override any dev-mode ssl:false
    sslConfig = { rejectUnauthorized: false };

    if (isProduction) {
        // Production (Railway/Heroku): Rewrite to use IPv4 connection pooler
        console.log('⚠️  Production Supabase detected. Switching to IPv4 Pooler...');
        try {
            const url = new URL(connectionString);
            url.hostname = 'aws-1-ap-south-1.pooler.supabase.com';
            url.port = '6543';

            if (!url.username.includes('uvnkbewvpewocaqzysqb')) {
                url.username = 'postgres.uvnkbewvpewocaqzysqb';
            }
            
            connectionString = url.toString();
            const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
            console.log('✅ Pooler Connection:', masked);
        } catch (e) {
            console.error('❌ Failed to optimize connection string:', e.message);
        }
    } else {
        // Development: Use the direct Supabase connection (no pooler rewrite)
        const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
        console.log('✅ Direct Supabase Connection (dev):', masked);
    }
}

const pool = new Pool({
    connectionString,
    max: 10, 
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    ssl: sslConfig,
    allowExitOnIdle: true
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        if (err.message.includes('ENETUNREACH')) {
            console.error('   💡 Tip: This host is IPv6-only. Use the Supabase Connection Pooler for IPv4 environments like Railway.');
        }
        if (err.message.includes('SSL') || err.message.includes('ssl')) {
            console.error('   💡 Tip: Supabase requires SSL. Ensure ssl: { rejectUnauthorized: false } is set.');
        }
        if (err.message.includes('password authentication failed')) {
            console.error('   💡 Tip: Check that the @ in your DB password is URL-encoded as %40 in DATABASE_URL.');
        }
    } else {
        console.log('✅ Database connected — PostgreSQL ready');
        release();
    }
});


module.exports = pool;
