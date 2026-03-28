const pool = require('../db/pool');
const automationService = require('./automationService');

class IntegrationService {
    /**
     * Map WhatsApp (WhatAPI) incoming message to a Lead
     */
    async handleWhatsAppLead(tenantId, payload, io) {
        // Try multiple common field names for WhatsApp API payloads
        const phone = payload.sender || payload.from || payload.whatsapp_number || payload.phone;
        const message = payload.message || payload.text || payload.body || payload.content;
        const name = payload.name || payload.chat_name || payload.contact_name;

        if (!phone) {
            console.warn('[Integration] WhatsApp payload missing phone/sender field', payload);
            // Fallback to generic parsing if specific fields aren't found
            return await this.handleGenericLead(tenantId, payload, 'WhatsApp', io);
        }

        return await this.createLeadFromIntegration({
            tenant_id: tenantId,
            name: name || `WA-${String(phone).slice(-4)}`,
            phone: phone,
            notes: message ? `WhatsApp: ${message}` : 'New contact from WhatsApp',
            source: 'WhatsApp'
        }, io);
    }

    /**
     * Map Facebook Lead Ads to a Lead
     */
    async handleFacebookLead(tenantId, payload, io) {
        // Typical FB Payload: { "field_data": [{ "name": "full_name", "values": ["John Doe"] }, ...] }
        const data = {};
        if (payload.field_data) {
            payload.field_data.forEach(field => {
                data[field.name] = field.values[0];
            });
        }

        return await this.createLeadFromIntegration({
            tenant_id: tenantId,
            name: data.full_name || data.first_name + ' ' + data.last_name || 'FB Lead',
            phone: data.phone_number,
            email: data.email,
            city: data.city,
            source: 'Facebook Ads'
        }, io);
    }

    /**
     * Map Google Ads Lead to a Lead
     */
    async handleGoogleLead(tenantId, payload, io) {
        // Typical Google Lead Form Payload: { "user_column_data": [{ "column_name": "Full Name", "string_value": "John" }, ...] }
        const data = {};
        if (payload.user_column_data) {
            payload.user_column_data.forEach(col => {
                data[col.column_name] = col.string_value;
            });
        }

        return await this.createLeadFromIntegration({
            tenant_id: tenantId,
            name: data['Full Name'] || 'Google Lead',
            phone: data['Phone Number'],
            email: data['User Email'],
            source: 'Google Ads'
        }, io);
    }

    /**
     * Generic parser for various JSON webhooks (Zapier, etc.)
     */
    async handleGenericLead(tenantId, payload, source = 'External', io) {
        return await this.createLeadFromIntegration({
            tenant_id: tenantId,
            name: payload.name || payload.full_name || payload.first_name || 'New Lead',
            phone: payload.phone || payload.phone_number || payload.mobile,
            email: payload.email,
            city: payload.city,
            source: source,
            notes: payload.notes || payload.message
        }, io);
    }

    /**
     * Generic lead creation with automation trigger
     */
    async createLeadFromIntegration(leadData, io) {
        const { tenant_id, name, phone, email, city, notes, source } = leadData;

        try {
            // Check for duplicates within tenant
            const dup = await pool.query('SELECT id FROM leads WHERE tenant_id = $1 AND phone = $2', [tenant_id, phone]);
            if (dup.rows.length > 0) {
                console.log(`[Integration] Duplicate lead ignored for ${phone}`);
                return { status: 'duplicate', id: dup.rows[0].id };
            }

            const { rows } = await pool.query(
                `INSERT INTO leads (tenant_id, name, phone, email, city, notes, source, stage, score, priority)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'New', 50, 'Medium')
                 RETURNING *`,
                [tenant_id, name, phone, email || null, city || null, notes || null, source]
            );

            const newLead = rows[0];

            // Trigger Automation
            automationService.handleLeadCreate(newLead, io).catch(err => {
                console.error('[Integration Automation] Failed:', err);
            });

            return { status: 'created', id: newLead.id };
        } catch (err) {
            console.error('[Integration Service] Error creating lead:', err);
            throw err;
        }
    }

    /**
     * Fetch existing contacts from WhatsApp API and import them
     */
    async syncContacts(tenantId, apiKey) {
        console.log(`[Integration Sync] Starting sync for tenant ${tenantId}...`);

        // If no key provided, try to fetch it from DB
        if (!apiKey) {
            const { rows } = await pool.query('SELECT api_key FROM integrations WHERE tenant_id = $1 AND provider = $2', [tenantId, 'whatsapp']);
            apiKey = rows[0]?.api_key;
        }

        if (!apiKey) throw new Error('API Key missing. Please configure WhatsApp first.');

        const authBasic = Buffer.from(`${apiKey}:`).toString('base64');
        const authBearer = `Bearer ${apiKey}`;

        const endpoints = [
            // CRM ListAll (POST)
            { url: 'https://crmapi.whatapi.in/api/chat_panel/chat/listall', method: 'POST', body: { isSearch: false, isFilter: false, page: 0, rows: 100 }, auth: authBearer },
            { url: 'https://crmapi.whatapi.in/api/chat_panel/chat/listall', method: 'POST', body: { isSearch: false, isFilter: false, page: 0, rows: 100 }, auth: `Basic ${authBasic}` },
            { url: 'https://crmapi1.whatapi.in/api/chat_panel/chat/listall', method: 'POST', body: { isSearch: false, isFilter: false, page: 0, rows: 100 }, auth: authBearer },
            { url: 'https://mapi.1automations.com/api/chat_panel/chat/listall', method: 'POST', body: { isSearch: false, isFilter: false, page: 0, rows: 100 }, auth: authBearer },

            // Standard Contacts (GET)
            { url: 'https://crmapi.whatapi.in/contacts', method: 'GET', auth: authBearer },
            { url: 'https://crmapi1.whatapi.in/contacts', method: 'GET', auth: authBearer },
            { url: 'https://crmapi1.whatapi.in/api/contacts', method: 'GET', auth: authBearer },
            { url: 'https://gate.whapi.cloud/contacts', method: 'GET', auth: authBearer }
        ];

        let lastError = null;
        for (const ep of endpoints) {
            try {
                console.log(`[Integration Sync] Attempting ${ep.method} ${ep.url} with ${ep.auth.split(' ')[0]}...`);
                const response = await fetch(ep.url, {
                    method: ep.method,
                    headers: {
                        'Authorization': ep.auth,
                        'Content-Type': 'application/json'
                    },
                    body: ep.body ? JSON.stringify(ep.body) : null
                });

                if (!response.ok) {
                    const txt = await response.text();
                    console.warn(`[Integration Sync] ${ep.url} failed: ${response.status} - ${txt.slice(0, 100)}`);
                    lastError = `API Error: ${response.status} from ${new URL(ep.url).hostname}`;
                    continue;
                }

                const data = await response.json();
                // Handle various response structures
                // WhatAPI.in listall usually returns { list: [...], totalCount: ... } or results directly
                const contacts = data.list || data.contacts || data.data || (Array.isArray(data) ? data : []);
                console.log(`[Integration Sync] Success! Found ${contacts.length} items.`);

                let imported = 0;
                let skipped = 0;

                for (const contact of contacts) {
                    let phone = '';
                    let name = '';

                    // WhatAPI.in specific fields
                    const id = contact.waNumber || contact.phoneNumber || contact.id || contact.jid || contact.phone || contact.number;
                    if (!id) continue;

                    phone = String(id).split('@')[0].replace(/\D/g, ''); // Extract digits only
                    name = contact.name || contact.pushname || contact.chatName || contact.chat_name;

                    if (!phone) continue;

                    const res = await this.createLeadFromIntegration({
                        tenant_id: tenantId,
                        name: name || `WA-${phone.slice(-4)}`,
                        phone: phone,
                        source: 'WhatsApp',
                        notes: 'Imported via Contact Sync'
                    }, null); // Pass null for io if not available here

                    if (res.status === 'created') imported++;
                    else skipped++;
                }

                return { imported, skipped };
            } catch (err) {
                console.error(`[Integration Sync] Error with ${ep.url}:`, err.message);
                lastError = err.message;
            }
        }

        throw new Error(lastError || 'Failed to sync with WhatsApp API');
    }

    /**
     * Log the incoming request
     */
    async logIncoming(tenantId, provider, payload, status = 'received', error = null, leadId = null) {
        await pool.query(
            `INSERT INTO incoming_leads_log (tenant_id, provider, payload, status, error_message, lead_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tenantId, provider, JSON.stringify(payload), status, error, leadId]
        );
    }
}

module.exports = new IntegrationService();
