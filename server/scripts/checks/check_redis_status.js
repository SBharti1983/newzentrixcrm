const { createClient } = require('redis');
require('dotenv').config();

async function checkRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Connecting to:', redisUrl);
    
    const client = createClient({ url: redisUrl });
    client.on('error', (err) => console.log('Redis Error:', err.message));
    
    try {
        await client.connect();
        console.log('✅ Redis connection successful');
        
        await client.set('test_key', 'ZentrixCacheActive');
        const val = await client.get('test_key');
        console.log('Test Key Value:', val);
        
        if (val === 'ZentrixCacheActive') {
            console.log('🚀 Redis Cache is fully functional');
        } else {
            console.log('⚠️ Redis stored value mismatch');
        }
        
        await client.disconnect();
    } catch (err) {
        console.log('❌ Redis check failed:', err.message);
    }
}

checkRedis();
