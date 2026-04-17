const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Detect Supabase IPv6-only hostname and suggest/use pooler for IPv4 compatibility (Railway fix)
let connectionString = process.env.DATABASE_URL;

if (connectionString && (connectionString.includes('supabase.co') || connectionString.includes('supabase.com'))) {
    console.log('⚠️  Detecting Supabase connection. Optimizing for IPv4/Pooler compatibility...');
    
    try {
        const url = new URL(connectionString);
        
        // 1. Force use of the IPv4-compatible pooler host
        url.hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
        
        // 2. Use Session Mode port (5432) or Transaction Mode port (6543)
        // Railway works best with 5432 (Session) or 6543. We'll try 6543 (Pooler) first.
        url.port = '6543';
        
        // 3. Ensure username includes the project ref (required by pooler)
        if (!url.username.includes('uvnkbewvpewocaqzysqb')) {
            url.username = 'postgres.uvnkbewvpewocaqzysqb';
        }
        
        // 4. Critical: The URL class will automatically percent-encode the password
        // This fixes issues if the password contains '@', which confuses simpler parsers.
        connectionString = url.toString();

        // Log masked version for verification
        const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
        console.log('✅ Optimized Connection String:', masked);
    } catch (e) {
        console.error('❌ Failed to optimize connection string:', e.message);
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
