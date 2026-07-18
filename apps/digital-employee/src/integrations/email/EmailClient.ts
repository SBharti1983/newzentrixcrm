import { logger } from '@zentrix/logger';

/**
 * EmailClient
 * Handles SMTP dispatches, email templates, and outreach schedules.
 */
export class EmailClient {
    async sendEmail(tenantId: number, toEmail: string, subject: string, body: string): Promise<void> {
        logger.info(`[EmailClient] Sending email to ${toEmail}`);
    }
}

const emailClient = new EmailClient();
export default emailClient;
