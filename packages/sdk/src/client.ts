/**
 * Unified Zentrix CRM & AI Platform API Client Gateway
 */

import axios, { AxiosInstance } from 'axios';
import { ZentrixCrmClient } from './crm';
import { ZentrixAiClient } from './ai';
import { ZentrixTelephonyClient } from './telephony';

export interface ZentrixClientOptions {
    baseUrl: string;
    apiKey: string;
    timeout?: number;
}

export class ZentrixClient {
    private readonly http: AxiosInstance;
    
    public readonly crm: ZentrixCrmClient;
    public readonly ai: ZentrixAiClient;
    public readonly telephony: ZentrixTelephonyClient;

    constructor(options: ZentrixClientOptions) {
        this.http = axios.create({
            baseURL: options.baseUrl,
            timeout: options.timeout || 10000,
            headers: {
                'Authorization': `Bearer ${options.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Instantiate domain subclasses clients
        this.crm = new ZentrixCrmClient(this.http);
        this.ai = new ZentrixAiClient(this.http);
        this.telephony = new ZentrixTelephonyClient(this.http);
    }
}
