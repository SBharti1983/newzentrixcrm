import { describe, test, expect, vi } from 'vitest';
import monikaSchedulingService from '../../src/skills/SiteVisitBooking';
import { pool } from '@zentrix/database';

vi.mock('@zentrix/database', () => ({
    pool: {
        query: vi.fn().mockResolvedValue({
            rows: [{ id: 'booking-xyz', status: 'proposed' }],
            rowCount: 1,
        }),
    },
}));

describe('Site Visit Booking Integration Tests', () => {
    test('bookMeeting creates a booking record and returns it', async () => {
        const booking = await monikaSchedulingService.bookMeeting(
            1,
            'persona-monika',
            {
                type: 'site_visit',
                proposed_datetime: '2026-07-20T10:00:00Z',
                project_id: 'project-abc',
                project_name: 'Sunrise Heights',
                with_party: 'rohan',
                status: 'proposed',
                note: 'First visit',
            },
            'Raj Kumar',
            '+919876543210',
            'lead-999'
        );
        expect(booking.id).toBe('booking-xyz');
        expect(booking.status).toBe('proposed');
        expect(pool.query).toHaveBeenCalled();
    });
});
