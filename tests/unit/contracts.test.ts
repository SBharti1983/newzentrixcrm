/**
 * Unit Tests for Zentrix API Contracts
 *
 * Verifies payload schemas structure.
 *
 * Run using: npx vitest run tests/unit/contracts.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { CrmContracts, TelephonyContracts } from '@zentrix/contracts';

describe('Zentrix CRM Contracts', () => {
    test('Contracts: Interfaces typecheck successfully', () => {
        const mockLeadReq: CrmContracts.CreateLeadRequest = {
            tenantId: 'tenant-123',
            name: 'Jane Doe',
            phone: '+919999999999',
            source: 'Organic Search',
            budgetMin: 5000000,
            budgetMax: 7500000
        };

        const mockCallReq: TelephonyContracts.LogCallRequest = {
            tenantId: 'tenant-123',
            callId: 'call-789',
            leadId: 'lead-456',
            durationSeconds: 120,
            outcome: 'answered'
        };

        assert.strictEqual(mockLeadReq.name, 'Jane Doe');
        assert.strictEqual(mockCallReq.outcome, 'answered');
    });
});
