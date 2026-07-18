/**
 * JWT Token signing and verification helpers
 */

import jwt from 'jsonwebtoken';

export interface UserPayload {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
}

/**
 * Sign a new JWT access token
 */
export function generateToken(payload: UserPayload, secret: string, expiresIn: string = '24h'): string {
    return jwt.sign(payload, secret, { expiresIn } as any);
}

/**
 * Verify and decode an existing JWT access token
 */
export function verifyToken(token: string, secret: string): UserPayload {
    return jwt.verify(token, secret) as UserPayload;
}
