/**
 * MonikaSchedulingService — Meeting & Site Visit Booking
 *
 * Handles the persistence side of Monika's scheduling actions:
 *  - Book meetings (with Surendra / Rohan / Neha)
 *  - Book site visits (with a project + sales party)
 *  - Look up existing bookings for a caller
 *  - Cancel / reschedule bookings
 *
 * All bookings land in the `ai_receptionist_bookings` table (created by the
 * migration in packages/database/migrations/add_monika_receptionist.sql).
 *
 * NOTE: This module runs inside apps/digital-employee — isolated from CRM API.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    DbMeeting,
    ReceptionistScheduling,
    HandoffTarget,
} from '@zentrix/types';

class MonikaSchedulingService {
    /**
     * Persist a scheduling decision from Monika's reasoning output.
     * Returns the created booking row.
     */
    async bookMeeting(
        tenantId: number,
        personaId: string,
        scheduling: ReceptionistScheduling,
        callerName: string,
        callerPhone: string,
        leadId?: string
    ): Promise<DbMeeting> {
        try {
            const { rows } = await pool.query(
                `INSERT INTO ai_receptionist_bookings
                    (tenant_id, persona_id, lead_id, caller_name, caller_phone,
                     meeting_type, scheduled_at, duration_minutes, project_id,
                     project_name, with_party, status, note, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'monika')
                 RETURNING *`,
                [
                    tenantId,
                    personaId,
                    leadId || null,
                    callerName,
                    callerPhone,
                    scheduling.type,
                    scheduling.proposed_datetime || null,
                    scheduling.type === 'site_visit' ? 90 : 30,
                    scheduling.project_id || null,
                    scheduling.project_name || null,
                    scheduling.with_party || null,
                    scheduling.status || 'proposed',
                    scheduling.note || null,
                ]
            );

            logger.info(`[MonikaScheduling] Booked ${scheduling.type} for ${callerName} (${callerPhone}) → id=${rows[0].id}`);
            return rows[0] as DbMeeting;
        } catch (err: any) {
            logger.error(`[MonikaScheduling] Failed to book meeting: ${err.message}`);
            throw err;
        }
    }

    /**
     * Confirm a tentative/proposed booking (after the caller agrees to the slot).
     */
    async confirmBooking(bookingId: string): Promise<DbMeeting | null> {
        try {
            const { rows } = await pool.query(
                `UPDATE ai_receptionist_bookings
                 SET status = 'confirmed', updated_at = NOW()
                 WHERE id = $1
                 RETURNING *`,
                [bookingId]
            );
            return (rows[0] as DbMeeting) || null;
        } catch (err: any) {
            logger.error(`[MonikaScheduling] Failed to confirm booking ${bookingId}: ${err.message}`);
            return null;
        }
    }

    /**
     * Cancel a booking.
     */
    async cancelBooking(bookingId: string): Promise<boolean> {
        try {
            const { rowCount } = await pool.query(
                `UPDATE ai_receptionist_bookings
                 SET status = 'cancelled', updated_at = NOW()
                 WHERE id = $1`,
                [bookingId]
            );
            return (rowCount || 0) > 0;
        } catch (err: any) {
            logger.error(`[MonikaScheduling] Failed to cancel booking ${bookingId}: ${err.message}`);
            return false;
        }
    }

    /**
     * Look up upcoming bookings for a caller (by phone).
     * Used so Monika can say "Aapka ek visit already scheduled hai Tuesday ko."
     */
    async getUpcomingBookings(callerPhone: string, tenantId: number): Promise<DbMeeting[]> {
        try {
            const { rows } = await pool.query(
                `SELECT * FROM ai_receptionist_bookings
                 WHERE tenant_id = $1
                   AND caller_phone = $2
                   AND status IN ('proposed', 'confirmed')
                   AND scheduled_at >= NOW()
                 ORDER BY scheduled_at ASC
                 LIMIT 5`,
                [tenantId, callerPhone]
            );
            return rows as DbMeeting[];
        } catch (err: any) {
            logger.error(`[MonikaScheduling] Failed to fetch bookings for ${callerPhone}: ${err.message}`);
            return [];
        }
    }

    /**
     * Check whether a proposed slot conflicts with an existing booking for
     * the same party (so Monika doesn't double-book Surendra/Rohan).
     */
    async isSlotAvailable(
        tenantId: number,
        withParty: HandoffTarget,
        proposedAt: string,
        durationMinutes: number = 30
    ): Promise<boolean> {
        try {
            const { rows } = await pool.query(
                `SELECT 1 FROM ai_receptionist_bookings
                 WHERE tenant_id = $1
                   AND with_party = $2
                   AND status IN ('proposed', 'confirmed')
                   AND scheduled_at < $4
                   AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $3
                 LIMIT 1`,
                [tenantId, withParty, proposedAt, new Date(new Date(proposedAt).getTime() + durationMinutes * 60000).toISOString()]
            );
            return rows.length === 0;
        } catch (err: any) {
            logger.error(`[MonikaScheduling] Slot availability check failed: ${err.message}`);
            // Fail open — allow booking if the check errors so the call isn't blocked.
            return true;
        }
    }
}

const monikaSchedulingService = new MonikaSchedulingService();
export default monikaSchedulingService;
export { MonikaSchedulingService };
