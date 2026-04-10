const pool = require('../db/pool');

/**
 * Sends a WhatsApp message using the Official Meta Cloud API.
 * Securely fetches the specific tenant's WhatsApp API keys from the database.
 */
const sendWhatsappMessage = async (tenantId, toPhoneNumber, messageText) => {
    try {
        // Fetch Tenant-Specific Configuration
        const { rows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
        if (!rows.length) return false;

        const settings = rows[0].settings || {};
        const apiToken = settings.whatsapp_api_key;
        const phoneId = settings.whatsapp_phone_id;

        if (!apiToken || !phoneId || apiToken === 'Not configured') {
            console.log(`[WhatsApp] Skipped: API keys not configured for tenant ${tenantId}`);
            return false;
        }

        // Format phone number (Meta requires country code without + or leading zeros)
        let formattedPhone = toPhoneNumber.replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = `91${formattedPhone}`; // Default to India (+91) if 10 digits
        }

        // Send to Meta Graph API
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: messageText }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[WhatsApp] Meta API Error:', data.error?.message);
            return false;
        }

        console.log(`[WhatsApp] Follow-up sent securely to ${formattedPhone}`);
        return true;
    } catch (err) {
        console.error('[WhatsApp] Dispatch Failed:', err);
        return false;
    }
};

module.exports = { sendWhatsappMessage };
