/**
 * Unit Tests for Zentrix Messaging Infrastructure
 *
 * Verifies:
 * 1. Type-safe Event Publishing and Subscription
 * 2. Local (in-process) event propagation speed
 *
 * Run using: npx vitest run tests/unit/messaging.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { LocalBus } from '@zentrix/messaging';

describe('Zentrix CRM Messaging', () => {
    test('Messaging: local publish/subscribe propagates payload exactly', () => {
        let callEndedReceived = false;
        let receivedPayload: any = null;

        const localBus = new LocalBus();

        // 1. Subscribe to 'call:ended' event
        localBus.subscribe('call:ended', (payload) => {
            callEndedReceived = true;
            receivedPayload = payload;
        });

        // 2. Publish a test payload
        const testPayload = {
            tenantId: 1,
            callId: 'call-123',
            leadId: 'lead-456',
            durationSeconds: 45,
            summary: 'Objection raised regarding payment plan, details sent.',
            recordingUrl: 'https://storage.zentrix.in/records/call-123.wav'
        };

        const t0 = performance.now();
        localBus.publish('call:ended', testPayload);
        const elapsed = performance.now() - t0;

        // 3. Verify assertions
        assert.strictEqual(callEndedReceived, true, 'Callback should be triggered');
        assert.deepStrictEqual(receivedPayload, testPayload, 'Payload content must match exactly');

        assert.ok(elapsed < 1000, `Local pub/sub latency should be sub-second, got ${elapsed.toFixed(3)}ms`);
    });
});
