/**
 * ZentrixCRM API Client
 * Centralized HTTP layer — all API calls go through here
 */

const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const defaultApiUrl = isProd 
    ? 'https://zentrixcrm-production-cd2d.up.railway.app/api'
    : 'http://localhost:5050/api';
let BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
BASE_URL = BASE_URL.replace(/\/$/, '');

// ─── Token helpers ────────────────────────────────────────────────
export function getToken() {
    return sessionStorage.getItem('zentrix_token');
}
export function setToken(token) {
    sessionStorage.setItem('zentrix_token', token);
}
export function clearTokens() {
    sessionStorage.removeItem('zentrix_token');
    sessionStorage.removeItem('zentrix_refresh_token');
    sessionStorage.removeItem('zentrix_user');
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

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error(`[API ERROR] Path: ${path} | Status: ${res.status}`, err);
        throw err;
    }

    return res.json();
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
    exportCalls: () => api('/leads/export-calls'),
    aiScore: (id) => api(`/leads/${id}/ai-score`, { method: 'POST' }),
    getMatches: (id) => api(`/leads/${id}/matches`),
};

// ─── Projects ─────────────────────────────────────────────────────
export const projectsApi = {
    list: (params = {}) => api('/projects?' + new URLSearchParams(params)),
    get: (id) => api(`/projects/${id}`),
    create: (data) => api('/projects', { method: 'POST', body: data }),
    update: (id, data) => api(`/projects/${id}`, { method: 'PATCH', body: data }),
    inventory: (id, params = {}) => api(`/projects/${id}/inventory?` + new URLSearchParams(params)),
    addUnit: (id, data) => api(`/projects/${id}/inventory`, { method: 'POST', body: data }),
    updateUnit: (projectId, unitId, data) => api(`/projects/${projectId}/inventory/${unitId}`, { method: 'PATCH', body: data }),
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

// ─── Documents / Agreements ───────────────────────────────────────
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

// ─── Super Admin ──────────────────────────────────────────────────
export const superAdminApi = {
    getTenants: () => api('/superadmin/tenants'),
    createTenant: (data) => api('/superadmin/tenants', { method: 'POST', body: data }),
    updateTenant: (id, data) => api(`/superadmin/tenants/${id}`, { method: 'PATCH', body: data }),
    deleteTenant: (id) => api(`/superadmin/tenants/${id}`, { method: 'DELETE' }),
    getStats: () => api('/superadmin/stats'),
};

// ─── Billing ──────────────────────────────────────────────────────
export const billingApi = {
    subscribe: (data) => api('/billing/subscribe', { method: 'POST', body: data }),
    razorpayOrder: (data) => api('/billing/razorpay/order', { method: 'POST', body: data }),
    razorpayVerify: (data) => api('/billing/razorpay/verify', { method: 'POST', body: data }),
};
