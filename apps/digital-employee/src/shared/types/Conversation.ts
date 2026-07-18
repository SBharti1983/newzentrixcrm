import { ChannelType } from '../enums/ChannelType';

export interface Conversation {
    id: string;
    leadId?: string;
    customerId?: string;
    channel: ChannelType;
    startedAt: Date;
    endedAt?: Date;
    status: 'active' | 'completed' | 'failed';
    metadata?: Record<string, any>;
}
