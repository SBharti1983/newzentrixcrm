import crmQueries, { CrmQueries } from './CrmQueries';
import crmUpdater, { CrmUpdater } from './CrmUpdater';
import { CrmMapper } from './CrmMapper';

/**
 * CrmClient
 * Unified entry point/façade for interacting with the CRM layer.
 * Coordinates queries (reads), updaters (writes), and maps raw SQL models to domain types.
 */
export class CrmClient {
    public queries: CrmQueries;
    public updater: CrmUpdater;
    public mapper: typeof CrmMapper;

    constructor() {
        this.queries = crmQueries;
        this.updater = crmUpdater;
        this.mapper = CrmMapper;
    }

    /**
     * Retrieve a mapped lead domain entity.
     */
    async getLead(tenantId: number, leadId: string) {
        const raw = await this.queries.getLead(tenantId, leadId);
        if (!raw) return null;
        return this.mapper.toDomainLead(raw);
    }
}

const crmClient = new CrmClient();
export default crmClient;
