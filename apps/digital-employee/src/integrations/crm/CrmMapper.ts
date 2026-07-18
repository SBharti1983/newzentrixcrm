import { RawLeadRow, RawUserRow } from './CrmQueries';

export interface DomainLead {
    id: string;
    tenantId: number;
    name: string;
    phone: string;
    email?: string;
    status: string;
    source?: string;
    projectId?: string;
    budgetMin?: number;
    budgetMax?: number;
    assignedTo?: string;
    notes?: string;
    tags?: string[];
    aiScore?: number;
    sentiment?: string;
    nurtureStage?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface DomainUser {
    id: string;
    name: string;
    telephonyAgentId?: string;
    phone?: string;
    role: string;
}

export class CrmMapper {
    /**
     * Map database row attributes to domain entity representation.
     */
    static toDomainLead(row: RawLeadRow): DomainLead {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            status: row.status,
            source: row.source,
            projectId: row.project_id,
            budgetMin: row.budget_min,
            budgetMax: row.budget_max,
            assignedTo: row.assigned_to,
            notes: row.notes,
            tags: row.tags,
            aiScore: row.ai_score,
            sentiment: row.sentiment,
            nurtureStage: row.nurture_stage,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    /**
     * Map database user/manager row attributes to domain user representation.
     */
    static toDomainUser(row: RawUserRow): DomainUser {
        return {
            id: row.id,
            name: row.name,
            telephonyAgentId: row.telephony_agent_id,
            phone: row.phone,
            role: row.role,
        };
    }
}
