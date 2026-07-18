/**
 * Unit Tests for Zentrix Security Package
 *
 * Verifies:
 * 1. JWT sign & verify cycle
 * 2. AES-256-GCM encryption & decryption
 * 3. RBAC hierarchy resolution
 *
 * Run using: npx vitest run tests/unit/security.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { generateToken, verifyToken, encryptString, decryptString, hasRole, buildAuditEvent } from '@zentrix/security';

describe('Zentrix CRM Security', () => {
    test('Security JWT: Token signing and verification succeeds', () => {
        const payload = {
            userId: 'user-789',
            tenantId: 'tenant-456',
            role: 'agent',
            email: 'agent@zentrix.in'
        };
        const secret = 'super-secret-key-12345';

        const token = generateToken(payload, secret);
        const decoded = verifyToken(token, secret);

        assert.strictEqual(decoded.userId, payload.userId);
        assert.strictEqual(decoded.role, payload.role);
    });

    test('Security Cipher: AES-256-GCM symmetric encryption succeeds', () => {
        const secretKey = 'encryption-salt-secret-key';
        const plainText = 'ZentrixSecureFieldPayload';

        const encrypted = encryptString(plainText, secretKey);
        const decrypted = decryptString(encrypted, secretKey);

        assert.strictEqual(decrypted, plainText);
        assert.notStrictEqual(encrypted, plainText);
    });

    test('Security RBAC: Access roles hierarchy asserts correctly', () => {
        assert.ok(hasRole('superadmin', 'agent'));
        assert.ok(hasRole('admin', 'agent'));
        assert.ok(!hasRole('agent', 'admin'));
    });

    test('Security Audit: Event logger schema maps correctly', () => {
        const audit = buildAuditEvent({
            tenantId: 'tenant-456',
            userId: 'user-789',
            action: 'user.login',
            resource: 'auth',
            status: 'success'
        });
        assert.ok(audit.timestamp);
        assert.strictEqual(audit.action, 'user.login');
    });
});
