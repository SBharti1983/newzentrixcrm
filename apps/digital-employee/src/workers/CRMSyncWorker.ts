import { eventBus } from '../events/EventBus';
import { logger } from '@zentrix/logger';
import crmUpdater from '../integrations/crm/CrmUpdater';
import { LeadQualifiedPayload } from '../events/LeadQualifiedEvent';

export class CRMSyncWorker {
    static init(): void {
        eventBus.subscribe<LeadQualifiedPayload>('lead:qualified', async (event) => {
            const { leadId, tenantId, nurtureStage } = event.payload;
            logger.info(
                `[CRMSyncWorker] Lead qualified event received for Lead ${leadId}. Syncing status to central CRM...`
            );
            await crmUpdater.applyCRMUpdates(tenantId, leadId, { stage_change: nurtureStage });
        });
    }
}
