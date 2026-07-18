import { AppEvent } from './EventBus';

export interface SiteVisitBookedPayload {
    tenantId: number;
    leadId: string;
    projectId: string;
    visitDate: string;
}

export class SiteVisitBookedEvent implements AppEvent<SiteVisitBookedPayload> {
    eventName = 'site_visit:booked';
    timestamp: string;
    payload: SiteVisitBookedPayload;

    constructor(payload: SiteVisitBookedPayload) {
        this.timestamp = new Date().toISOString();
        this.payload = payload;
    }
}
