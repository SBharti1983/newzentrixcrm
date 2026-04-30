import pool from '../db/pool';
import axios from 'axios';

/**
 * Sends a WhatsApp message using the Official Meta Cloud API.
 * Securely fetches the specific tenant's WhatsApp API keys from the database.
 */
export const sendWhatsappMessage = async (tenantId: string | number, toPhoneNumber: string, messageText: string): Promise<boolean> => {
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
        const response = await axios.post(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: messageText }
        }, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status !== 200) {
            console.error('[WhatsApp] Meta API Error:', response.data.error?.message);
            return false;
        }

        console.log(`[WhatsApp] Follow-up sent securely to ${formattedPhone}`);
        return true;
    } catch (err: any) {
        console.error('[WhatsApp] Dispatch Failed:', err.response?.data || err.message);
        return false;
    }
};

