/**
 * Billing & Subscription Domain API Contracts
 */

export interface CreateSubscriptionRequest {
    tenantId: string;
    planId: string;
    paymentMethodId: string;
}

export interface CreateSubscriptionResponse {
    success: boolean;
    subscriptionId: string;
    clientSecret?: string;
    status: string;
}
