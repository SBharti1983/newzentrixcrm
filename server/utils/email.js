const nodemailer = require('nodemailer');
const pool = require('../db/pool');

/**
 * Sends a professional email using the specific tenant's SMTP settings.
 * Securely fetches host, port, user, and password from the tenant's configuration table.
 */
const sendEmail = async (tenantId, { to, subject, html, text }) => {
    try {
        // 1. Fetch Tenant-Specific SMTP Configuration
        const { rows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
        if (!rows.length) {
            console.error(`[Email Service] Tenant ${tenantId} not found.`);
            return false;
        }

        const settings = rows[0].settings || {};
        const smtpConfig = {
            host: settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(settings.smtp_port) || parseInt(process.env.SMTP_PORT) || 587,
            secure: (settings.smtp_port == 465), // true for 465, false for other ports
            auth: {
                user: settings.smtp_user || process.env.SMTP_USER,
                pass: settings.smtp_pass || process.env.SMTP_PASS,
            },
        };

        if (!smtpConfig.auth.user || !smtpConfig.auth.pass || smtpConfig.auth.user === 'Not configured') {
            console.warn(`[Email Service] Skipped: SMTP not configured for tenant ${tenantId}`);
            return false;
        }

        // 2. Create the Transporter
        const transporter = nodemailer.createTransport(smtpConfig);

        // 3. Send Mail
        const info = await transporter.sendMail({
            from: `"${settings.company_name || 'Zentrix AI Assistant'}" <${smtpConfig.auth.user}>`,
            to,
            subject,
            text,
            html
        });

        console.log(`[Email Service] Summary dispatched successfully: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error('[Email Service] Failed to send email:', err);
        return false;
    }
};

module.exports = { sendEmail };
