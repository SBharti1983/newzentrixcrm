import { AppEvent } from './EventBus';

export interface CallbackScheduledPayload {
    tenantId: number;
    leadId: string;
    scheduledTime: string;
}

export class CallbackScheduledEvent implements AppEvent<CallbackScheduledPayload> {
    eventName = 'callback:scheduled';
    timestamp: string;
    payload: CallbackScheduledPayload;

    constructor(payload: CallbackScheduledPayload) {
        this.timestamp = new Date().toISOString();
        this.payload = payload;
    }
}
