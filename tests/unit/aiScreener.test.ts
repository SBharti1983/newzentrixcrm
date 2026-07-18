/**
 * Regression test for the NULL-notes data-loss bug in AIScreener.processReply.
 *
 * Background:
 *   The original SET clause was `notes = l.notes || '\nAI Summary: ' || $N`.
 *   In PostgreSQL, `NULL || 'text'` evaluates to NULL (not the text), so any
 *   lead whose `notes` column was already NULL would silently lose the AI
 *   summary on every screening. The fix uses `COALESCE(notes, '') || ...`.
 *
 * This test mocks the DB pool, AI util, and Rohan bridge, then asserts that
 * the UPDATE statement emitted by processReply contains the COALESCE guard
 * and does NOT reference the invalid `l.notes` alias in the SET clause.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---------------------------------------------------------------
// vi.mock factories are hoisted above all imports/declarations, so any value
// they reference must itself be hoisted via vi.hoisted to avoid a TDZ
// "Cannot access X before initialization" ReferenceError.
const { mockQuery, mockGenerateAIResponse, mockHandshake } = vi.hoisted(() => ({
    mockQuery: vi.fn(),
    mockGenerateAIResponse: vi.fn(),
    mockHandshake: vi.fn(),
}));

// Mock the DB pool (default + named export) the same way pacing-dialer.test.ts does.
vi.mock('@zentrix/database', () => ({
    pool: { query: mockQuery },
}));

// Mock the AI util so processReply gets deterministic structured output.
mockGenerateAIResponse.mockResolvedValue({
    intent: 9,
    budget_info: '75L',
    user_use: 'Investment',
    summary: 'Interested in 2BHK for investment.',
});
vi.mock('../../apps/api/src/utils/ai', () => ({
    generateAIResponse: mockGenerateAIResponse,
}));

// Mock the Rohan bridge client so no HTTP/voice service is contacted.
mockHandshake.mockResolvedValue(null);
vi.mock('../../apps/api/src/modules/ai/rohanBridge/RohanBridgeClient', () => ({
    default: { handshake: mockHandshake },
}));

// Import the service AFTER mocks are registered so it picks up the stubs.
import aiScreener from '../../apps/api/src/modules/ai/screening/AiScreenerService';

describe('AIScreener.processReply — NULL-notes regression', () => {
    beforeEach(() => {
        mockQuery.mockReset();
    });

    test('UPDATE uses COALESCE(notes, ...) and never the buggy l.notes alias', async () => {
        // First call: SELECT lead (with NULL notes — the dangerous case).
        // Subsequent calls: UPDATE leads, INSERT interaction. We only assert on the UPDATE.
        mockQuery.mockImplementation(async (sql: string) => {
            if (sql.startsWith('SELECT')) {
                return { rows: [{ id: 42, tenant_id: 7, name: 'Test Lead', notes: null }] };
            }
            return { rows: [] };
        });

        await aiScreener.processReply(42, 'Looking for a 2BHK around 75L for investment', null);

        // Find the UPDATE leads call.
        const updateCall = mockQuery.mock.calls.find(
            (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE leads')
        );
        expect(updateCall, 'processReply must issue an UPDATE leads statement').toBeTruthy();

        const updateSql: string = updateCall![0];

        // Positive: the COALESCE guard must be present.
        expect(updateSql).toMatch(/COALESCE\s*\(\s*notes\s*,\s*''\s*\)/i);

        // Negative: the old buggy form (`l.notes ||` or bare `notes ||` without COALESCE
        // in the SET clause) must NOT appear. We check that `l.notes` is never referenced.
        expect(updateSql).not.toMatch(/l\.notes/i);

        // The AI summary parameter must be passed positionally.
        const params: any[] = updateCall![1];
        expect(params).toContain('Interested in 2BHK for investment.');
    });

    test('existing non-NULL notes are preserved and appended to', async () => {
        mockQuery.mockImplementation(async (sql: string) => {
            if (sql.startsWith('SELECT')) {
                return { rows: [{ id: 43, tenant_id: 7, name: 'Warm Lead', notes: 'Prefers 3BHK.' }] };
            }
            return { rows: [] };
        });

        await aiScreener.processReply(43, 'Budget around 75L', null);

        const updateCall = mockQuery.mock.calls.find(
            (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE leads')
        );
        expect(updateCall).toBeTruthy();
        const updateSql: string = updateCall![0];

        // COALESCE keeps the existing note text and appends the AI summary.
        expect(updateSql).toMatch(/COALESCE\s*\(\s*notes\s*,\s*''\s*\)/i);
        expect(updateSql).toMatch(/AI Summary/i);
    });
});
