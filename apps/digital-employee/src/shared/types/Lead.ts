import { LeadStatus } from '../enums/LeadStatus';

export interface Lead {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    status: LeadStatus;
    source?: string;
    projectId?: string;
    budgetMin?: number;
    budgetMax?: number;
    assignedTo?: string;
    notes?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt?: Date;
}
