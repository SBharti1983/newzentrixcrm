/**
 * CRM Domain API Contracts
 */

export interface CreateLeadRequest {
    tenantId: string;
    name: string;
    phone: string;
    email?: string;
    source?: string;
    projectId?: string;
    budgetMin?: number;
    budgetMax?: number;
    notes?: string;
}

export interface CreateLeadResponse {
    success: boolean;
    leadId: string;
    message?: string;
}

export interface ConfirmBookingRequest {
    tenantId: string;
    leadId: string;
    projectId: string;
    unitId?: string;
    amount: number;
    paymentMethod: 'stripe' | 'wire' | 'cash';
}

export interface ConfirmBookingResponse {
    success: boolean;
    bookingId: string;
    status: string;
    confirmedAt: string;
}
