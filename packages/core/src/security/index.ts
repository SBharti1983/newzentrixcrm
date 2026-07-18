/**
 * Cryptographic & Security Helpers
 */

import crypto from 'crypto';

/**
 * Generate a random securely-hashed API key string
 */
export function generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Perform a secure constant-time string comparison to defend against timing attacks
 */
export function safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
