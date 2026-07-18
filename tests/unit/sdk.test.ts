/**
 * Unit Tests for Zentrix Client SDK
 *
 * Verifies:
 * 1. ZentrixClient gateway properties initialize correctly
 *
 * Run using: npx vitest run tests/unit/sdk.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { ZentrixClient } from '@zentrix/sdk';

describe('Zentrix CRM Platform SDK', () => {
    test('SDK: Platform client components instantiated correctly', () => {
        const client = new ZentrixClient({
            baseUrl: 'https://api.zentrixcrmindia.com',
            apiKey: 'test-api-token-key-789'
        });

        assert.ok(client.crm);
        assert.ok(client.ai);
        assert.ok(client.telephony);
    });
});
