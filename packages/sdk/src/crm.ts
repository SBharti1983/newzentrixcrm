/**
 * Zentrix CRM Client SDK
 */

import { AxiosInstance } from 'axios';
import { CrmContracts } from '@zentrix/contracts';

export class ZentrixCrmClient {
    constructor(private readonly http: AxiosInstance) {}

    /**
     * Create a new Lead inside Zentrix CRM
     */
    async createLead(request: CrmContracts.CreateLeadRequest): Promise<CrmContracts.CreateLeadResponse> {
        const response = await this.http.post<CrmContracts.CreateLeadResponse>('/v1/leads', request);
        return response.data;
    }

    /**
     * Confirm a project booking transactions
     */
    async confirmBooking(request: CrmContracts.ConfirmBookingRequest): Promise<CrmContracts.ConfirmBookingResponse> {
        const response = await this.http.post<CrmContracts.ConfirmBookingResponse>('/v1/bookings', request);
        return response.data;
    }
}
