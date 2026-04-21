const { Pool } = require('pg');
const config = require('../config/secrets');

let connectionString = config.database.connectionString;

if (connectionString && (connectionString.includes('supabase.co') || connectionString.includes('supabase.com'))) {
    console.log('⚠️  Detecting Supabase connection. Optimizing for IPv4/Pooler compatibility...');
    
    try {
        const url = new URL(connectionString);
        url.hostname = 'aws-1-ap-south-1.pooler.supabase.com';
        url.port = '6543';

        if (!url.username.includes('uvnkbewvpewocaqzysqb')) {
            url.username = 'postgres.uvnkbewvpewocaqzysqb';
        }
        
        connectionString = url.toString();
        const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
        console.log('✅ Optimized Connection String:', masked);
    } catch (e) {
        console.error('❌ Failed to optimize connection string:', e.message);
    }
}

const pool = new Pool({
    connectionString,
    max: 20, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: config.database.ssl,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        if (err.message.includes('ENETUNREACH')) {
            console.error('   💡 Tip: This host is IPv6-only. Use the Supabase Connection Pooler for IPv4 environments like Railway.');
        }
    } else {
        console.log('✅ Database connected — PostgreSQL ready');
        release();
    }
});


module.exports = pool;
