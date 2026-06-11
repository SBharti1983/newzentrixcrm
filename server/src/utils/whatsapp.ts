import pool from '../db/pool';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import { logger } from './logger';

/**
 * Sends a WhatsApp message using the Official Meta Cloud API.
 * Securely fetches the specific tenant's WhatsApp API keys from the database.
 */
const _sendWhatsappMessage = async (tenantId: string | number, toPhoneNumber: string, messageText: string): Promise<boolean> => {
    // Fetch Tenant-Specific Configuration
    const { rows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
    if (!rows.length) return false;

    const settings = rows[0].settings || {};
    const apiToken = settings.whatsapp_api_key;
    const phoneId = settings.whatsapp_phone_id;

    if (!apiToken || !phoneId || apiToken === 'Not configured') {
        logger.info(`[WhatsApp] Skipped: API keys not configured for tenant ${tenantId}`);
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
        logger.error(`[WhatsApp] Meta API Error: ${response.data.error?.message}`);
        return false;
    }

    logger.info(`[WhatsApp] Follow-up sent securely to ${formattedPhone}`);
    return true;
};

// Instantiate the WhatsApp Circuit Breaker
const whatsappBreaker = new CircuitBreaker(_sendWhatsappMessage, {
    timeout: 10000,                // 10s execution timeout
    errorThresholdPercentage: 50,  // Trip if 50% of attempts fail
    resetTimeout: 30000            // Try to close again after 30s
});

whatsappBreaker.fallback((err: any) => {
    logger.warn(`[WHATSAPP CIRCUIT BREAKER] Whatsapp sending bypassed (circuit breaker active): ${err?.message || 'Breaker open'}`);
    return false;
});

// Export the wrapper function to maintain seamless backward compatibility
export const sendWhatsappMessage = (tenantId: string | number, toPhoneNumber: string, messageText: string): Promise<boolean> => {
    return whatsappBreaker.fire(tenantId, toPhoneNumber, messageText);
};

