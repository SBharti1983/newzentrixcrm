import { logger } from '@zentrix/logger';

/**
 * CalendarClient
 * Handles sync with scheduling tools (e.g. Google Calendar, Cal.com) for site visits and meetings.
 */
export class CalendarClient {
    async bookMeeting(tenantId: number, attendeeEmail: string, startTime: Date): Promise<void> {
        logger.info(`[CalendarClient] Booking meeting with ${attendeeEmail} at ${startTime}`);
    }
}

const calendarClient = new CalendarClient();
export default calendarClient;
