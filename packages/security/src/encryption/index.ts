/**
 * AES-256-GCM symmetric string encryption and decryption helpers
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

/**
 * Encrypt a plain-text string using AES-256-GCM
 */
export function encryptString(text: string, secretKey: string): string {
    // Derive key using sha256 to ensure exact 32 bytes key length
    const derivedKey = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    // Package IV, AuthTag and encrypted payload as single colon-separated block
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to plain-text
 */
export function decryptString(payload: string, secretKey: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const derivedKey = crypto.createHash('sha256').update(secretKey).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
