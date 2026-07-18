/**
 * Global Constants & Configurations
 */

export const SYSTEM_ROLE = {
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
    AGENT: 'agent',
    CUSTOMER: 'customer',
    BROKER: 'broker'
} as const;

export const TELEPHONY_OUTCOME = {
    ANSWERED: 'answered',
    NO_ANSWER: 'no-answer',
    BUSY: 'busy',
    ESCALATED: 'escalated'
} as const;

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
