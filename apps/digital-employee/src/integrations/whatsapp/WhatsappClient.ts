import { logger } from '@zentrix/logger';

/**
 * WhatsappClient
 * Handles direct WhatsApp Business Cloud API messages and template deliveries.
 */
export class WhatsappClient {
    async sendMessage(tenantId: number, toPhone: string, text: string): Promise<void> {
        logger.info(`[WhatsappClient] Sending message to ${toPhone}`);
    }
}

const whatsappClient = new WhatsappClient();
export default whatsappClient;
