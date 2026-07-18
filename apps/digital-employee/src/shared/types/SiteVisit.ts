export interface SiteVisit {
    id: string;
    leadId: string;
    projectId: string;
    scheduledAt: Date;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    feedback?: string;
    hostId?: string; // sales executive
    createdAt: Date;
    updatedAt?: Date;
}
