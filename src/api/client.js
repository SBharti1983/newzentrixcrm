/**
 * ZentrixCRM API Client
 * Centralized HTTP layer — all API calls go through here
 */

const isProd = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : false;
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// In dev mode or on localhost, use relative '/api' so requests go through the Vite proxy.
// In production (non-localhost), use the full Railway backend URL.
const defaultApiUrl = window.location.hostname === 'localhost' ? '/api' : 'https://zentrixcrmindia-production.up.railway.app/api';
export let BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
BASE_URL = BASE_URL.replace(/\/$/, '');
console.log('[API MODE] Host:', typeof window !== 'undefined' ? window.location.hostname : 'ssr', '| Target:', BASE_URL);
console.log('[API DEBUG] Base URL Mode:', isLocal ? 'Local' : 'Remote', '| Resolved:', BASE_URL);

// For public endpoints (doesn't require auth token)
const PUBLIC_BASE_URL = BASE_URL;

// ─── Token helpers ────────────────────────────────────────────────
export function getToken() {
    try { return sessionStorage.getItem('zentrix_token'); } catch { return null; }
}
export function setToken(token) {
    try { sessionStorage.setItem('zentrix_token', token); } catch {}
}
export function clearTokens() {
    try {
        sessionStorage.removeItem('zentrix_token');
        sessionStorage.removeItem('zentrix_refresh_token');
        sessionStorage.removeItem('zentrix_user');
    } catch {}
}

// ─── Core fetch wrapper ───────────────────────────────────────────
async function api(path, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const fullUrl = `${BASE_URL}${path}`;
    try {
        const res = await fetch(fullUrl, {
            ...options,
            headers,
            body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
        });

        // Handle 401 — token expired → try to refresh (except for login/register)
        if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/register')) {
            const refreshed = await tryRefresh();
            if (refreshed) {
                // Retry once with new token
                const retryRes = await fetch(`${BASE_URL}${path}`, {
                    ...options,
                    headers: { ...headers, Authorization: `Bearer ${getToken()}` },
                    body: options.body ? JSON.stringify(options.body) : undefined,
                });
                if (!retryRes.ok) throw await retryRes.json();
                return retryRes.json();
            } else {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Session expired');
            }
        }

        if (res.status === 403) {
            try {
                const clone = res.clone();
                const json = await clone.json();
                if (json.code === 'ACCOUNT_LOCKED') {
                    window.dispatchEvent(new CustomEvent('zentrix_lockout'));
                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('zentrix_lockout'));
                }
            } catch (e) {}
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            console.error(`[API ERROR] Path: ${path} | Status: ${res.status}`, err);
            throw err;
        }

        return res.json();
    } catch (e) {
        if (e.message === 'Failed to fetch') {
            const diag = `Network Error (Failed to fetch). Target: ${fullUrl}. Check if your backend is alive and CORS is allowed.`;
            console.error(diag);
            throw new Error(diag);
        }
        throw e;
    }
}

async function tryRefresh() {
    try {
        const refreshToken = sessionStorage.getItem('zentrix_refresh_token');
        if (!refreshToken) return false;
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const { accessToken, refreshToken: newRefresh } = await res.json();
        setToken(accessToken);
        sessionStorage.setItem('zentrix_refresh_token', newRefresh);
        return true;
    } catch {
        return false;
    }
}

// ─── Auth ─────────────────────────────────────────────────────────
export const authApi = {
    login: (email, password, subdomain) =>
        api('/auth/login', { method: 'POST', body: { email, password, subdomain } }),
    getTenant: (slug) => 
        api(`/auth/tenant/${slug}`),
    register: (data) =>
        api('/auth/register', { method: 'POST', body: data }),
    logout: () => {
        const refreshToken = sessionStorage.getItem('zentrix_refresh_token');
        return api('/auth/logout', { method: 'POST', body: { refreshToken } });
    },
    me: () =>
        api('/auth/me'),
};


export const searchApi = {
    global: (q) => api(`/search?q=${encodeURIComponent(q)}`),
};
export const dashboardApi = {
    get: (params = {}) => api('/dashboard?' + new URLSearchParams(params)),
};

// ─── Leads ───────────────────────────────────────────────────────
export const leadsApi = {
    list: (params = {}) => api('/leads?' + new URLSearchParams(params)),
    get: (id) => api(`/leads/${id}`),
    create: (data) => api('/leads', { method: 'POST', body: data }),
    update: (id, data) => api(`/leads/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => api(`/leads/${id}`, { method: 'DELETE' }),
    bulkUpdate: (data) => api('/leads/bulk-update', { method: 'POST', body: data }),
    bulkDelete: (data) => api('/leads/bulk-delete', { method: 'POST', body: data }),
    followups: (id) => api(`/leads/${id}/followups`),
    addInteraction: (id, data) => api(`/leads/${id}/interactions`, { method: 'POST', body: data }),
    updateInteraction: (leadId, interactionId, data) => api(`/leads/${leadId}/interactions/${interactionId}`, { method: 'PATCH', body: data }),
    deleteInteraction: (leadId, interactionId) => api(`/leads/${leadId}/interactions/${interactionId}`, { method: 'DELETE' }),
    exportCalls: (params = {}) => api('/leads/export-calls?' + new URLSearchParams(params)),
    generatePhysicalReport: (csvContent, filename) => api('/leads/generate-physical-report', { method: 'POST', body: { csvContent, filename } }),
    aiScore: (id) => api(`/leads/${id}/ai-score`, { method: 'POST' }),
    deepScore: (id) => api(`/leads/${id}/ai-score`, { method: 'POST' }),
    getMatches: (id) => api(`/leads/${id}/matches`),
    addDeal: (id, data) => api(`/leads/${id}/deals`, { method: 'POST', body: data }),
    import: (formData) => api('/leads/import', { method: 'POST', body: formData }),
};

// ─── Projects ─────────────────────────────────────────────────────
export const projectsApi = {
    list: (params = {}) => api('/projects?' + new URLSearchParams(params)),
    get: (id) => api(`/projects/${id}`),
    create: (data) => api('/projects', { method: 'POST', body: data }),
    update: (id, data) => api(`/projects/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => api(`/projects/${id}`, { method: 'DELETE' }),
    inventory: (id, params = {}) => api(`/projects/${id}/inventory?` + new URLSearchParams(params)),
};

// ─── Bookings ────────────────────────────────────────────────────
export const bookingsApi = {
    list: (params = {}) => api('/bookings?' + new URLSearchParams(params)),
    get: (id) => api(`/bookings/${id}`),
    create: (data) => api('/bookings', { method: 'POST', body: data }),
    update: (id, data) => api(`/bookings/${id}`, { method: 'PATCH', body: data }),
    payInstallment: (bookingId, installmentId, data) =>
        api(`/bookings/${bookingId}/installments/${installmentId}`, { method: 'PATCH', body: data }),
};

// ─── Customers ───────────────────────────────────────────────────
export const customersApi = {
    list: () => api('/customers'),
    get: (id) => api(`/customers/${id}`),
    create: (data) => api('/customers', { method: 'POST', body: data }),
    update: (id, data) => api(`/customers/${id}`, { method: 'PATCH', body: data }),
};

// ─── Follow-ups ──────────────────────────────────────────────────
export const followupsApi = {
    list: (params = {}) => api('/followups?' + new URLSearchParams(params)),
    create: (data) => api('/followups', { method: 'POST', body: data }),
    update: (id, data) => api(`/followups/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => api(`/followups/${id}`, { method: 'DELETE' }),
};

// ─── Site Visits ─────────────────────────────────────────────────
export const siteVisitsApi = {
    list: (params = {}) => api('/site-visits?' + new URLSearchParams(params)),
    create: (data) => api('/site-visits', { method: 'POST', body: data }),
    update: (id, data) => api(`/site-visits/${id}`, { method: 'PATCH', body: data }),
};

// ─── Templates ────────────────────────────────────────────────────
export const templatesApi = {
    list: () => api('/templates'),
};

// ─── Channel Partners ─────────────────────────────────────────────
export const channelPartnersApi = {
    list: () => api('/channel-partners'),
    create: (data) => api('/channel-partners', { method: 'POST', body: data }),
    update: (id, data) => api(`/channel-partners/${id}`, { method: 'PATCH', body: data }),
};

// ─── Analytics ────────────────────────────────────────────────────
export const analyticsApi = {
    get: (params = {}) => api('/analytics?' + new URLSearchParams(params)),
};

// ─── Automations ──────────────────────────────────────────────────
export const automationsApi = {
    list: () => api('/automations'),
    create: (data) => api('/automations', { method: 'POST', body: data }),
    toggle: (id, data) => api(`/automations/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => api(`/automations/${id}`, { method: 'DELETE' }),
    getLogs: () => api('/automations/logs'),
};

export const zapierApi = {
    enrichLead: (id) => api(`/zapier/enrich-lead/${id}`, { method: 'POST' }),
    generateContent: (data) => api('/zapier/generate-content', { method: 'POST', body: data }),
    summarizeCall: (data) => api('/zapier/summarize-call', { method: 'POST', body: data }),
    transcribeCall: (formData) => api('/zapier/transcribe-call', { method: 'POST', body: formData }),
    getRecommendations: () => api('/zapier/smart-recommendations'),
    sendWebhook: (data) => api('/zapier/webhook', { method: 'POST', body: data }),
};

export const marketingApi = {
    getDrips: () => api('/marketing/drips'),
    createDrip: (data) => api('/marketing/drips', { method: 'POST', body: data }),
    enrollLeads: (id, leadIds) => api(`/marketing/drips/${id}/enroll`, { method: 'POST', body: { leadIds } }),
    getAnalytics: (id) => api(`/marketing/drips/${id}/analytics`),
    
    // WhatsApp Broadcasts
    getBroadcasts: () => api('/marketing/broadcasts'),
    createBroadcast: (data) => api('/marketing/broadcasts', { method: 'POST', body: data }),
    
    // Chatbot
    getChatbot: () => api('/marketing/chatbot'),
    updateChatbot: (data) => api('/marketing/chatbot', { method: 'PATCH', body: data }),
};

export const automationApi = {
    getRules: () => api('/automation/rules'),
    updateRule: (id, data) => api(`/automation/rules/${id}`, { method: 'PUT', body: data }),
    getLogs: () => api('/automation/logs'),
};

export const referralsApi = {
    getPartner: (id) => api(`/referrals/partner/${id}`),
    getProjects: () => api('/referrals/projects'),
    submit: (data) => api('/referrals/submit', { method: 'POST', body: data }),
};

export const integrationsApi = {
    getList: () => api('/integrations'),
    setup: (data) => api('/integrations/setup', { method: 'POST', body: data }),
    delete: (id) => api(`/integrations/${id}`, { method: 'DELETE' }),
    getIncomingLogs: () => api('/integrations/incoming-logs'),
    sync: (body) => api('/integrations/sync', { method: 'POST', body: body }),
};

export const commissionsApi = {
    list: (params = {}) => api('/commissions?' + new URLSearchParams(params)),
    update: (id, data) => api(`/commissions/${id}`, { method: 'PATCH', body: data }),
    generate: (bookingId) => api('/commissions/generate', { method: 'POST', body: { booking_id: bookingId } }),
};

// ─── Users ───────────────────────────────────────────────────────
export const usersApi = {
    list: () => api('/users'),
    create: (data) => api('/users', { method: 'POST', body: data }),
    update: (id, data) => api(`/users/${id}`, { method: 'PATCH', body: data }),
};

// ─── Enquiries (public) ───────────────────────────────────────────
export const enquiriesApi = {
    submit: (data) => api('/enquiries', { method: 'POST', body: data }),
    list: (params = {}) => api('/enquiries?' + new URLSearchParams(params)),
    update: (id, data) => api(`/enquiries/${id}`, { method: 'PATCH', body: data }),
};

// ─── Telephony / MDM ──────────────────────────────────────────────
export const telephonyApi = {
    pushConfig: (data) => api('/telephony/push-config', { method: 'POST', body: data }),
    getAnalytics: () => api('/telephony/analytics'),
    getAgentActivity: () => api('/telephony/agent-activity'),
    broadcastAlert: (data) => api('/telephony/broadcast-alert', { method: 'POST', body: data }),
    getBridgeConfig: () => api('/telephony/bridge-config'),
    updateBridgeConfig: (data) => api('/telephony/bridge-config', { method: 'PUT', body: data }),
};

export const copilotApi = {
    ask: (data) => api('/copilot/ask', { method: 'POST', body: data })
};
export const documentsApi = {
    list: (params = {}) => api('/documents?' + new URLSearchParams(params)),
    get: (id) => api(`/documents/${id}`),
    create: (data) => api('/documents', { method: 'POST', body: data }),
    update: (id, data) => api(`/documents/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => api(`/documents/${id}`, { method: 'DELETE' }),
};

export const notificationsApi = {
    list: (params = {}) => api('/notifications?' + new URLSearchParams(params)),
    conversations: () => api('/notifications/conversations'),
    send: (data) => api('/notifications/send', { method: 'POST', body: data }),
    bulkSend: (data) => api('/notifications/bulk-send', { method: 'POST', body: data }),
    draftReply: (data) => api('/notifications/draft-reply', { method: 'POST', body: data }),
    update: (id, data) => api(`/notifications/${id}`, { method: 'PATCH', body: data }),
};

export const academyApi = {
    getModules: (params = {}) => api('/academy/modules?' + new URLSearchParams(params)),
    upload: (formData) => api('/academy/upload', { method: 'POST', body: formData }),
    updateProgress: (data) => api('/academy/progress', { method: 'POST', body: data }),
    getLeaderboard: () => api('/academy/leaderboard'),
    deleteModule: (id) => api(`/academy/modules/${id}`, { method: 'DELETE' }),
    // Battle Cards
    getBattleCards: () => api('/academy/battle-cards'),
    createBattleCard: (data) => api('/academy/battle-cards', { method: 'POST', body: data }),
    updateBattleCard: (id, data) => api(`/academy/battle-cards/${id}`, { method: 'PUT', body: data }),
    deleteBattleCard: (id) => api(`/academy/battle-cards/${id}`, { method: 'DELETE' }),
    simulate: (data) => api('/academy/simulate', { method: 'POST', body: data }),
    analyze: (data) => api('/academy/analyze', { method: 'POST', body: data }),
    generateBattleCard: (data) => api('/academy/battle-cards/generate', { method: 'POST', body: data }),
    generatePitch: (data) => api('/academy/generate-pitch', { method: 'POST', body: data }),
    getBattleMission: (scenarioId) => api('/academy/battle/init', { method: 'POST', body: { scenarioId } }),
    judgeBattle: (data) => api('/academy/battle/judge', { method: 'POST', body: data }),
    initializeLeadSimulation: (leadId) => api('/academy/simulate/lead-init', { method: 'POST', body: { leadId } }),
    calibrateVoice: (formData) => api('/academy/calibrate', { method: 'POST', body: formData }),
};

// ─── Super Admin ──────────────────────────────────────────────────
export const superAdminApi = {
    getTenants: () => api('/superadmin/tenants'),
    nudgeTenant: (id) => api(`/superadmin/tenants/${id}/nudge`, { method: 'POST' }),
    getSubscriptions: () => api('/superadmin/subscriptions'),
    getAuditLogs: () => api('/superadmin/audit-logs'),
    getUtilizationAlerts: () => api('/superadmin/utilization-alerts'),
    recordManualSubscription: (data) => api('/superadmin/subscriptions/manual', { method: 'POST', body: data }),
    createTenant: (data) => api('/superadmin/tenants', { method: 'POST', body: data }),
    updateTenant: (id, data) => api(`/superadmin/tenants/${id}`, { method: 'PATCH', body: data }),
    deleteTenant: (id) => api(`/superadmin/tenants/${id}`, { method: 'DELETE' }),
    getStats: () => api('/superadmin/stats'),
};

// ─── Settings ─────────────────────────────────────────────────────
export const settingsApi = {
    get: () => api('/settings'),
    update: (data) => api('/settings', { method: 'PATCH', body: data }),
};

// ─── Billing ──────────────────────────────────────────────────────
export const billingApi = {
    subscribe: (data) => api('/billing/subscribe', { method: 'POST', body: data }),
    razorpayOrder: (data) => api('/billing/razorpay/order', { method: 'POST', body: data }),
    razorpayVerify: (data) => api('/billing/razorpay/verify', { method: 'POST', body: data }),
};

export const aiApi = {
    generatePitch: (data) => api('/ai/generate-pitch', { method: 'POST', body: data }),
};

export const brokerApi = {
    getStats: () => api('/broker/stats'),
    getLeads: () => api('/broker/leads'),
    createLead: (data) => api('/broker/leads', { method: 'POST', body: data }),
    getCommissions: () => api('/broker/commissions'),
};

// Public API
export const publicApi = {
    getBranding: (hostname) => api(`/public/branding?hostname=${encodeURIComponent(hostname)}`),
};
