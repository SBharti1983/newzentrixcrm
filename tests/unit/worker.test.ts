/**
 * Unit Tests for Zentrix Background Worker Schedulers
 *
 * Verifies:
 * 1. Worker initializes correctly
 * 2. Background BullMQ job triggers run successfully
 *
 * Run using: npx vitest run tests/unit/worker.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { processNurtureJob } from '../../apps/worker/src/jobs/nurtureJob';
import { processRetentionJob } from '../../apps/worker/src/jobs/retentionJob';

describe('Zentrix CRM Background Worker', () => {
    test('Worker: scheduled BullMQ cycles executed successfully without throwing loop crashes', async () => {
        let nurtureExecuted = false;
        let retentionExecuted = false;

        // 1. Assert Nurture job processor executes successfully
        const nurtureResult = await processNurtureJob({
            id: 'job-nurture-test',
            data: {
                leadId: 'lead-test-123',
                campaignId: 'outreach-autumn',
                sequenceStep: 1
            }
        });
        assert.strictEqual(nurtureResult.success, true);
        assert.strictEqual(nurtureResult.processedLead, 'lead-test-123');
        nurtureExecuted = true;

        // 2. Assert Retention job processor executes successfully
        const retentionResult = await processRetentionJob({
            id: 'job-retention-test',
            data: {
                retentionDays: 30,
                tenantId: 1
            }
        });
        assert.strictEqual(retentionResult.success, true);
        assert.strictEqual(retentionResult.processedTenant, 1);
        retentionExecuted = true;

        assert.strictEqual(nurtureExecuted, true, 'Nurture cycle job should run');
        assert.strictEqual(retentionExecuted, true, 'Retention cleanup job should run');
    });
});
