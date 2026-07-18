/**
 * Zentrix Telephony Call Logging Client SDK
 */

import { AxiosInstance } from 'axios';
import { TelephonyContracts } from '@zentrix/contracts';

export class ZentrixTelephonyClient {
    constructor(private readonly http: AxiosInstance) {}

    /**
     * Log call logs data metadata
     */
    async logCall(request: TelephonyContracts.LogCallRequest): Promise<TelephonyContracts.LogCallResponse> {
        const response = await this.http.post<TelephonyContracts.LogCallResponse>('/v1/calls', request);
        return response.data;
    }
}
