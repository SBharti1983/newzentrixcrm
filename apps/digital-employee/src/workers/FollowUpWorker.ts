import { eventBus } from '../events/EventBus';
import { logger } from '@zentrix/logger';
import { CallbackScheduledPayload } from '../events/CallbackScheduledEvent';

export class FollowUpWorker {
    static init(): void {
        eventBus.subscribe<CallbackScheduledPayload>('callback:scheduled', async (event) => {
            const { leadId, scheduledTime } = event.payload;
            logger.info(
                `[FollowUpWorker] Callback scheduled for Lead ${leadId} at ${scheduledTime}. Sending WhatsApp notification...`
            );
            // WhatsApp / SMS outbound dispatch logic
        });
    }
}
