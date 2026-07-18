import { AppEvent } from './EventBus';

export interface LeadCreatedPayload {
    tenantId: number;
    leadId: string;
    name: string;
    phone: string;
    source: string;
}

export class LeadCreatedEvent implements AppEvent<LeadCreatedPayload> {
    eventName = 'lead:created';
    timestamp: string;
    payload: LeadCreatedPayload;

    constructor(payload: LeadCreatedPayload) {
        this.timestamp = new Date().toISOString();
        this.payload = payload;
    }
}
