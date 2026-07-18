import { eventBus } from '../events/EventBus';
import { logger } from '@zentrix/logger';
import { Metrics } from '../observability/Metrics';
import { LeadCreatedPayload } from '../events/LeadCreatedEvent';
import { LeadQualifiedPayload } from '../events/LeadQualifiedEvent';

export class AnalyticsWorker {
    static init(): void {
        eventBus.subscribe<LeadCreatedPayload>('lead:created', async (event) => {
            logger.info(`[AnalyticsWorker] Lead created event logged. Incrementing total leads metrics.`);
        });

        eventBus.subscribe<LeadQualifiedPayload>('lead:qualified', async (event) => {
            logger.info(`[AnalyticsWorker] Lead qualified event logged.`);
            Metrics.incrementLeadsQualified();
        });
    }
}
