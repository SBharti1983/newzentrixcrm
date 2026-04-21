/**
 * Production Secret Management & Configuration Loader
 * 
 * Centralizes all environment variables and provides safety checks for production deployment.
 */
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    
    database: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me',
        expiresIn: '24h'
    },
    
    ai: {
        geminiKey: process.env.GEMINI_API_KEY
    },
    
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        databaseUrl: process.env.FIREBASE_DATABASE_URL
    },
    
    infrastructure: {
        uploadDir: path.resolve(__dirname, '../../uploads'),
        backupsDir: path.resolve(__dirname, '../../backups')
    }
};

// --- Security Validation ---
const validateSecrets = () => {
    const critical = [
        { key: 'database.connectionString', name: 'DATABASE_URL' },
        { key: 'ai.geminiKey', name: 'GEMINI_API_KEY' },
        { key: 'firebase.projectId', name: 'FIREBASE_PROJECT_ID' }
    ];

    const missing = [];
    critical.forEach(s => {
        const parts = s.key.split('.');
        let val = config;
        parts.forEach(p => val = val ? val[p] : undefined);
        if (!val) missing.push(s.name);
    });

    if (missing.length > 0 && process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Missing required production secrets:', missing.join(', '));
        // In production, we might want to shut down, but for now we just log loudly
    } else if (missing.length > 0) {
        console.warn('DEVELOPMENT WARNING: Missing environment variables:', missing.join(', '));
    }
};

validateSecrets();

module.exports = config;
