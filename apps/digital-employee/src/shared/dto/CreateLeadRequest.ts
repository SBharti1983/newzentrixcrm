import { LeadStatus } from '../enums/LeadStatus';

export interface CreateLeadRequest {
    name: string;
    phone: string;
    email?: string;
    source?: string;
    projectId?: string;
    status?: LeadStatus;
    notes?: string;
    budgetMin?: number;
    budgetMax?: number;
}
