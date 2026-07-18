export interface BookVisitRequest {
    leadId: string;
    projectId: string;
    scheduledAt: string; // ISO date string
    notes?: string;
}
