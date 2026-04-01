export const ROLE_ACCESS = {
    superadmin: {
        label: 'Super Admin',
        color: 'var(--accent-rose)',
        bg: 'rgba(244,63,94,0.1)',
        pages: ['/', '/superadmin', '/billing', '/leads', '/pipeline', '/projects', '/inventory', '/customers', '/bookings', '/payment-tracker', '/agreements', '/followups', '/site-visits', '/notifications', '/channel-partners', '/analytics', '/voice-analytics', '/reports', '/admin', '/calendar', '/enquiry', '/customer-portal', '/inbox', '/automations', '/commissions', '/lead-scoring', '/automation-distribution', '/call-records', '/voice-analytics', '/whatsapp-marketing', '/integrations', '/command-center', '/leaderboard'],
    },
    admin: {
        label: 'Administrator',
        color: 'var(--accent-violet)',
        bg: 'rgba(139,92,246,0.1)',
        pages: ['/', '/leads', '/pipeline', '/projects', '/inventory', '/customers',
            '/bookings', '/payment-tracker', '/agreements', '/followups',
            '/site-visits', '/notifications', '/channel-partners', '/analytics', '/voice-analytics', '/reports', '/admin', '/calendar', '/enquiry', '/billing', '/customer-portal', '/inbox', '/automations', '/commissions', '/lead-scoring', '/automation-distribution', '/call-records', '/voice-analytics', '/whatsapp-marketing', '/integrations', '/command-center', '/leaderboard'],
    },
    sales_manager: {
        label: 'Manager',
        color: 'var(--navy-600)',
        bg: 'var(--navy-50)',
        pages: ['/', '/leads', '/pipeline', '/projects', '/inventory', '/customers',
            '/bookings', '/payment-tracker', '/agreements', '/followups',
            '/site-visits', '/notifications', '/channel-partners', '/analytics', '/voice-analytics', '/reports', '/admin', '/calendar', '/billing', '/customer-portal', '/inbox', '/automations', '/commissions', '/lead-scoring', '/automation-distribution', '/call-records', '/voice-analytics', '/whatsapp-marketing', '/integrations', '/command-center', '/leaderboard'],
    },
    agent: {
        label: 'Agent',
        color: 'var(--accent-emerald)',
        bg: 'rgba(16,185,129,0.1)',
        pages: ['/', '/leads', '/pipeline', '/followups', '/site-visits',
            '/customers', '/bookings', '/notifications', '/calendar', '/customer-portal', '/inbox', '/lead-scoring', '/call-records', '/voice-analytics', '/command-center', '/leaderboard'],
    },
    customer: {
        label: 'Customer',
        color: 'var(--navy-600)',
        bg: 'var(--navy-50)',
        pages: ['/', '/customer-portal'],
    },
    broker: {
        label: 'Channel Partner',
        color: 'var(--accent-cyan)',
        bg: 'rgba(6,182,212,0.1)',
        pages: ['/', '/broker-portal'],
    },
};
