import { describe, test, expect, vi } from 'vitest';
import crmUpdater from '../../src/integrations/crm/CrmUpdater';
import { pool } from '@zentrix/database';

vi.mock('@zentrix/database', () => ({
    pool: {
        query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    },
}));

describe('CRM Sync Integration Tests', () => {
    test('applyCRMUpdates issues pool queries to database', async () => {
        const spy = vi.spyOn(pool, 'query');
        await crmUpdater.applyCRMUpdates(1, 'lead-123', { stage_change: 'qualified' });
        expect(spy).toHaveBeenCalled();
    });
});
