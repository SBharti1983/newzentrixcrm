import { describe, test, vi, expect, beforeEach } from 'vitest';
import { PacingEngine } from '../../apps/worker/src/dialer/PacingEngine';
import { AIDialer } from '../../apps/worker/src/dialer/AIDialer';
import { LeadQueue } from '../../apps/worker/src/dialer/LeadQueue';
import { RetryManager } from '../../apps/worker/src/dialer/RetryManager';
import { CampaignManager } from '../../apps/worker/src/dialer/CampaignManager';
import { pool } from '@zentrix/database';
import axios from 'axios';

vi.mock('@zentrix/database', () => ({
    pool: {
        query: vi.fn()
    }
}));

vi.mock('axios');

describe('AI Dialer Modular Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    describe('AIDialer', () => {
        test('triggers call request correctly via HTTP POST', async () => {
            const mockAxiosPost = axios.post as any;
            mockAxiosPost.mockResolvedValue({ data: { success: true, callId: 'test-call-123' } });

            const dialer = new AIDialer();
            const res = await dialer.triggerCall('lead-1', '+919999999999', 'tenant-1');

            expect(res.success).toBe(true);
            expect(res.interactionId).toBe('test-call-123');
            expect(mockAxiosPost).toHaveBeenCalledWith('http://localhost:4000/api/v1/telephony/outbound/dial', {
                leadId: 'lead-1',
                phone: '+919999999999',
                tenantId: 'tenant-1'
            });
        });
    });

    describe('LeadQueue', () => {
        test('fetches next lead and handles exclusion list', async () => {
            const mockQuery = pool.query as any;
            mockQuery.mockResolvedValue({ rows: [{ id: 'lead-2', name: 'Lead 2', phone: '123', tenant_id: 'tenant-1' }] });

            const queue = new LeadQueue();
            const res = await queue.fetchNextLead('rohan-user-1', 'tenant-1', ['lead-blocked-1']);

            expect(res).not.toBeNull();
            expect(res?.id).toBe('lead-2');
            expect(mockQuery).toHaveBeenCalled();
            const sqlCall = mockQuery.mock.calls[0][0];
            expect(sqlCall).toContain('l.id != ALL($3)');
        });
    });

    describe('CampaignManager', () => {
        test('returns true if daily count exceeds limit', async () => {
            const mockQuery = pool.query as any;
            mockQuery.mockResolvedValue({ rows: [{ count: 50 }] });

            const manager = new CampaignManager();
            const res = await manager.checkDailyLimitReached('rohan-user-1', 40);

            expect(res).toBe(true);
            expect(mockQuery).toHaveBeenCalled();
        });

        test('returns false if daily count is within limit', async () => {
            const mockQuery = pool.query as any;
            mockQuery.mockResolvedValue({ rows: [{ count: 10 }] });

            const manager = new CampaignManager();
            const res = await manager.checkDailyLimitReached('rohan-user-1', 40);

            expect(res).toBe(false);
        });
    });

    describe('RetryManager', () => {
        test('excludes leads exceeding max retries today', async () => {
            const mockQuery = pool.query as any;
            // 3 failed attempts today
            mockQuery.mockResolvedValue({
                rows: [
                    { lead_id: 'lead-3', outcome: 'no answer', date: new Date().toISOString() },
                    { lead_id: 'lead-3', outcome: 'busy', date: new Date().toISOString() },
                    { lead_id: 'lead-3', outcome: 'failed', date: new Date().toISOString() }
                ]
            });

            const retryManager = new RetryManager();
            const excluded = await retryManager.getExcludedLeads('rohan-user-1');

            expect(excluded).toContain('lead-3');
        });

        test('excludes leads inside retry cooldown (1 hour)', async () => {
            const mockQuery = pool.query as any;
            // 1 failed attempt just 10 mins ago
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            mockQuery.mockResolvedValue({
                rows: [
                    { lead_id: 'lead-4', outcome: 'busy', date: tenMinsAgo }
                ]
            });

            const retryManager = new RetryManager();
            const excluded = await retryManager.getExcludedLeads('rohan-user-1');

            expect(excluded).toContain('lead-4');
        });
    });

    describe('PacingEngine Integration Flow', () => {
        test('orchestrates queue fetch, daily check, triggers call and pacing cooldown', async () => {
            const mockQuery = pool.query as any;
            mockQuery.mockImplementation(async (sql: string, params?: any[]) => {
                if (sql.includes('users')) {
                    return { rows: [{ id: 'rohan-user-123' }] };
                }
                if (sql.includes('ai_employee_personas')) {
                    if (sql.includes('UPDATE')) return { rows: [] };
                    return { rows: [{ id: 'persona-rohan-1', current_status: 'idle', cooldown_seconds: 20, tenant_id: 'tenant-1', max_daily_outbound: 100 }] };
                }
                if (sql.includes('leads')) {
                    return { rows: [{ id: 'lead-vip', name: 'Arjun', phone: '+919999999999', tenant_id: 'tenant-1' }] };
                }
                if (sql.includes('interactions')) {
                    return { rows: [] };
                }
                return { rows: [] };
            });

            const mockAxiosPost = axios.post as any;
            mockAxiosPost.mockResolvedValue({ data: { success: true, callId: 'call-modular-101' } });

            const pacing = new PacingEngine();
            await pacing.tick();

            // Verify dial HTTP API trigger
            expect(mockAxiosPost).toHaveBeenCalled();

            // Verify status marked 'busy'
            const busyCalls = mockQuery.mock.calls.filter((c: any) => c[0].includes("SET current_status = 'busy'"));
            expect(busyCalls.length).toBe(1);

            // Fast forward timers
            await vi.advanceTimersByTimeAsync(20000);

            // Verify status reset back to 'idle'
            const idleCalls = mockQuery.mock.calls.filter((c: any) => c[0].includes("SET current_status = 'idle'"));
            expect(idleCalls.length).toBe(1);
        });
    });
});
