import { AppEvent } from './EventBus';

export interface LeadQualifiedPayload {
    tenantId: number;
    leadId: string;
    score: number;
    nurtureStage: string;
}

export class LeadQualifiedEvent implements AppEvent<LeadQualifiedPayload> {
    eventName = 'lead:qualified';
    timestamp: string;
    payload: LeadQualifiedPayload;

    constructor(payload: LeadQualifiedPayload) {
        this.timestamp = new Date().toISOString();
        this.payload = payload;
    }
}
