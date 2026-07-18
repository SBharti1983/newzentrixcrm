/**
 * Unit Tests for Zentrix Telephony Router Aggregation
 *
 * Verifies that structured sub-routers (inbound, outbound, recordings, sip, campaigns, webhooks)
 * mount successfully.
 *
 * Run using: npx vitest run tests/unit/telephony-routes.test.ts
 */

import { describe, test } from 'vitest';
import express from 'express';
import assert from 'assert';
import telephonyRouter from '../../apps/api/src/modules/telephony';

describe('Zentrix CRM Telephony Restructure', () => {
    test('Telephony Module: 6 sub-routes mounted successfully', () => {
        const app = express();
        app.use('/api/v1/telephony', telephonyRouter);

        // Verify router exists and has registered sub-routes layers
        assert.ok(telephonyRouter);
        assert.strictEqual(typeof telephonyRouter, 'function');

        // Check if subdomains exist as router middlewares (6 subdomains: inbound, outbound, recordings, campaigns, sip, webhook)
        assert.ok(telephonyRouter.stack.length >= 6, 'Should have at least 6 sub-routes mounted');
    });
});
