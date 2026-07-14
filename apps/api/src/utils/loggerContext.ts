import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
    req: any;
    traceId: string;
}

// Stores the request context (holds the request object and traceId)
export const requestContextStore = new AsyncLocalStorage<RequestStore>();
