import * as admin from 'firebase-admin';

/**
 * Initializes Firebase Admin SDK using environment variables.
 * Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.app();

    try {
        const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
        const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
        let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

        if (!projectId || !clientEmail || !privateKey) {
            const missing = [];
            if (!projectId) missing.push('FIREBASE_PROJECT_ID');
            if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
            if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
            console.warn(`[FIREBASE] Initialization skipped. Missing env vars: ${missing.join(', ')}`);
            return null;
        }

        // --- PRIVATE KEY SANITIZATION ---
        // 1. Strip surrounding quotes if present
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        // 2. Handle escaped newlines
        privateKey = privateKey.replace(/\\n/g, '\n');

        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
            databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    } catch (err: any) {
        console.error('[FIREBASE] Critical Initialization Error:', err.message);
        return null;
    }
};

const app = initFirebase();
export const bucket = app ? admin.storage().bucket() : null;
export const db = app ? admin.database() : null;

// --- TENANT-SPECIFIC INITIALIZATION ---
// Cache for tenant-specific firebase apps to prevent duplicate init errors
const tenantApps = new Map<string, any>();

export const getTenantDb = (config: { projectId: string; clientEmail: string; privateKey: string; databaseURL?: string }) => {
    const { projectId, clientEmail, privateKey, databaseURL } = config;
    
    if (!projectId || !clientEmail || !privateKey) return null;
    
    const cacheKey = projectId;
    if (tenantApps.has(cacheKey)) return tenantApps.get(cacheKey).database();

    try {
        let sanitizedKey = privateKey.trim();
        if (sanitizedKey.startsWith('"') && sanitizedKey.endsWith('"')) {
            sanitizedKey = sanitizedKey.substring(1, sanitizedKey.length - 1);
        }
        sanitizedKey = sanitizedKey.replace(/\\n/g, '\n');

        const tenantApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: sanitizedKey,
            }),
            databaseURL: databaseURL || `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
        }, `app-${cacheKey}-${Date.now()}`); // Unique name to avoid conflicts

        tenantApps.set(cacheKey, tenantApp);
        return tenantApp.database();
    } catch (err: any) {
        console.error(`[FIREBASE] Failed to init tenant app ${projectId}:`, err.message);
        return null;
    }
};

export const isStorageEnabled = !!bucket;
export const isDbEnabled = !!db;
export { admin };

