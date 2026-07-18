import { eventBus } from '../events/EventBus';
import { logger } from '@zentrix/logger';
import { SiteVisitBookedPayload } from '../events/SiteVisitBookedEvent';

export class ReminderWorker {
    static init(): void {
        eventBus.subscribe<SiteVisitBookedPayload>('site_visit:booked', async (event) => {
            const { leadId, projectId, visitDate } = event.payload;
            logger.info(
                `[ReminderWorker] Site visit booked for Lead ${leadId} on project ${projectId} for ${visitDate}. Scheduling calendar reminder...`
            );
            // Calendar / reminder queueing logic
        });
    }
}
