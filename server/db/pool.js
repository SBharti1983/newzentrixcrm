const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Detect Supabase IPv6-only hostname and suggest/use pooler for IPv4 compatibility (Railway fix)
let connectionString = process.env.DATABASE_URL;

if (connectionString && connectionString.includes('db.uvnkbewvpewocaqzysqb.supabase.co')) {
    console.log('⚠️  Detecting direct Supabase IPv6 hostname. Patching for IPv4/Railway compatibility...');
    
    try {
        // Use the pooler host (which supports IPv4)
        const poolerHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
        connectionString = connectionString.replace('db.uvnkbewvpewocaqzysqb.supabase.co', poolerHost);
        
        // Use port 5432 for Session Mode (more compatible with direct-style queries)
        // or ensure 6543 is used if preferred. We'll stick to the host's default or 5432.
        
        // Ensure username is postgres.uvnkbewvpewocaqzysqb
        if (connectionString.includes('://postgres:') && !connectionString.includes('postgres.uvnkbewvpewocaqzysqb:')) {
            connectionString = connectionString.replace('://postgres:', '://postgres.uvnkbewvpewocaqzysqb:');
        }

        // Log masked version (hide password)
        const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
        console.log('✅ Patched Connection String:', masked);
    } catch (e) {
        console.error('❌ Failed to patch connection string:', e.message);
    }
}



const poolConfig = connectionString 
    ? { connectionString }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'zentrixcrm',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
    ...poolConfig,
    max: 20, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: (isProduction || connectionString) ? { rejectUnauthorized: false } : false,
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
