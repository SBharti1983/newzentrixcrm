import { bucket, isStorageEnabled } from './firebase';
import path from 'path';
import crypto from 'crypto';

/**
 * Uploads a file buffer to Firebase Storage and returns the public URL.
 * @param {Buffer} buffer - File content
 * @param {string} originalName - Original filename for extension
 * @param {string} folder - Destination folder (e.g. 'recordings', 'avatars')
 * @param {string} customFileName - Optional exact filename to use (without extension)
 * @returns {Promise<string>} - Public URL
 */
export const uploadToFirebase = async (buffer: any, originalName: string, folder = 'uploads', customFileName = null) => {
    if (!isStorageEnabled) {
        throw new Error('Firebase Storage is not configured in .env');
    }

    try {
        const ext = path.extname(originalName);
        const namePart = customFileName ? customFileName : `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const fileName = `${folder}/${namePart}${ext}`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
            metadata: { contentType: getMimeType(ext) },
            public: true
        });

        // Construct permanent public URL (Firebase Storage format)
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (err) {
        console.error('[FIREBASE UPLOAD] Failed:', err);
        throw err;
    }
};

const getMimeType = (ext) => {
    const mimes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.mp4': 'audio/mp4',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
        '.csv': 'text/csv'
    };
    return mimes[ext.toLowerCase()] || 'application/octet-stream';
};

