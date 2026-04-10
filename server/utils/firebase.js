const admin = require('firebase-admin');

/**
 * Initializes Firebase Admin SDK using environment variables.
 * Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.app();

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.warn('[FIREBASE] Missing credentials in .env. Storage features will be limited.');
            return null;
        }

        // Handle escaped newlines in private key
        privateKey = privateKey.replace(/\\n/g, '\n');

        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
            databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    } catch (err) {
        console.error('[FIREBASE] Initialization failed:', err.message);
        return null;
    }
};

const app = initFirebase();
const bucket = app ? admin.storage().bucket() : null;
const db = app ? admin.database() : null;

module.exports = {
    admin,
    bucket,
    db,
    isStorageEnabled: !!bucket,
    isDbEnabled: !!db
};
