import express, { Request, Response, NextFunction } from 'express';
import pool from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';
import { PUBLIC_KEY } from '../../utils/push';
import { sendEmail } from '../../utils/email';
import { sendWhatsappMessage } from '../../utils/whatsapp';
import CircuitBreaker from 'opossum';
import { logger } from '../../utils/logger';
let twilio: any = null;
try { const mod = 'twil' + 'io'; twilio = require(mod); } catch { /* twilio not installed, SMS disabled */ }
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// const __filename and __dirname are available in CommonJS

const router = express.Router();
router.get('/vapid-key', (req, res) => res.json({ publicKey: PUBLIC_KEY }));

router.use(authenticateToken);

// Subscribe to push
router.post('/push/register', async (req: any, res: Response) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) 
            return res.status(400).json({ error: 'Subscription object required' });

        const { endpoint, keys } = subscription;
        await pool.query(
            `INSERT INTO push_subscriptions (user_id, tenant_id, endpoint, p256dh, auth) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (user_id, endpoint) DO UPDATE 
             SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
            [req.user.id, req.tenantId, endpoint, keys.p256dh, keys.auth]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Push register error:', err);
        res.status(500).json({ error: 'Failed to register push subscription' });
    }
});

// Unsubscribe
router.post('/push/unsubscribe', async (req: any, res: Response) => {
    try {
        const { endpoint } = req.body;
        await pool.query(
            `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
            [req.user.id, endpoint]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// ─── Role guard ──────────────────────────────────────────────────────
const requireManager = (req: any, res: Response, next: NextFunction) => {
    if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
        return res.status(403).json({ error: 'Manager or Admin only' });
    next();
};

// ─── GET /api/notifications/conversations — grouped by lead ───────
router.get('/conversations', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(`
            SELECT DISTINCT ON (n.lead_id) 
                n.lead_id, 
                n.channel, 
                n.body as last_msg, 
                n.sent_at as time,
                l.name, 
                l.email,
                l.phone
            FROM notifications n
            JOIN leads l ON n.lead_id = l.id
            WHERE n.tenant_id = $1
            ORDER BY n.lead_id, n.sent_at DESC
        `, [req.tenantId]);
        res.json(rows);
    } catch (err) {
        console.error('GET /conversations error:', err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// ─── GET /api/notifications — list sent notifications ─────────────
router.get('/', async (req: any, res: Response) => {
    try {
        const { channel, lead_id, limit = 100, offset = 0 } = req.query;
        let q = `
            SELECT n.*, u.name as sent_by_name, l.name as lead_name
            FROM notifications n
            LEFT JOIN users u ON n.sent_by = u.id
            LEFT JOIN leads l ON n.lead_id = l.id
            WHERE n.tenant_id = $1
        `;
        const params: any[] = [req.tenantId];
        if (channel) { q += ` AND n.channel = $${params.length + 1}`; params.push(channel); }
        if (lead_id) { q += ` AND n.lead_id = $${params.length + 1}`; params.push(lead_id); }
        q += ` ORDER BY n.sent_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit as string), parseInt(offset as string));

        const { rows } = await pool.query(q, params);

        // Get totals for stats
        const stats = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE channel='Email')    as email_count,
                COUNT(*) FILTER (WHERE channel='SMS')      as sms_count,
                COUNT(*) FILTER (WHERE channel='WhatsApp') as whatsapp_count,
                COUNT(*) FILTER (WHERE status='Delivered') as delivered_count,
                COUNT(*) FILTER (WHERE status='Failed')    as failed_count,
                COUNT(*)                                   as total_count
            FROM notifications WHERE tenant_id = $1
        `, [req.tenantId]);

        res.json({ data: rows, stats: stats.rows[0] });
    } catch (err) {
        console.error('GET /notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// ─── Actual send helpers ─────────────
const _sendSMS = async ({ to, body }: { to: string, body: string }) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)
        throw new Error('Twilio SMS not configured');

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
    });
};

const smsBreaker = new CircuitBreaker(_sendSMS, {
    timeout: 10000,                // 10s execution timeout
    errorThresholdPercentage: 50,  // Trip if 50% of attempts fail
    resetTimeout: 30000            // Try to close again after 30s
});

smsBreaker.fallback((err: any) => {
    logger.warn(`[TWILIO CIRCUIT BREAKER] Twilio SMS sending bypassed (circuit breaker active): ${err?.message || 'Breaker open'}`);
    throw new Error(err?.message || 'Twilio SMS circuit breaker is active');
});

async function sendSMS({ to, body }: { to: string, body: string }) {
    return smsBreaker.fire({ to, body });
}

// ─── POST /api/notifications/send — log + (optionally) send ───────
router.post('/send', async (req: any, res: Response) => {
    try {
        const debugInfo = `\n[DEBUG ${new Date().toISOString()}] Payload: ${JSON.stringify(req.body)}\n`;
        fs.appendFileSync('debug_notifications.log', debugInfo);
        
        const { channels, recipient_name, recipient_phone, recipient_email, lead_id, subject, body } = req.body;
        if (!body || !channels?.length)
            return res.status(400).json({ error: 'Body and at least one channel are required' });

        const inserted = [];
        const errors = [];

        for (const channel of channels) {
            const recipient = channel === 'Email' ? recipient_email : recipient_phone;

            // 1. Log to DB
            const { rows } = await pool.query(
                `INSERT INTO notifications (tenant_id, sent_by, lead_id, channel, recipient, subject, body, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
                [req.tenantId, req.user.id, lead_id || null, channel,
                recipient || recipient_name, subject || null, body, 'Sent']
            );
            inserted.push(rows[0]);

            // Also log directly to the lead's timeline
            if (lead_id) {
                try {
                    await pool.query(
                        `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note)
                         VALUES ($1, $2, $3, $4, NOW(), $5)`,
                        [req.tenantId, lead_id, req.user.id, channel, `Outbound ${channel} Message:\n\n${body}`]
                    );
                } catch (interactionErr: any) {
                    console.error('Failed to log notification to timeline:', interactionErr.message);
                }
            }

            // 2. Attempt real send (graceful — if env vars missing, just log)
            try {
                if (channel === 'Email' && recipient_email) {
                    await sendEmail(req.tenantId, { to: recipient_email, subject: subject || 'Message from ZentrixCRM', html: body });
                    await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                } else if (channel === 'SMS' && recipient_phone) {
                    await sendSMS({ to: recipient_phone, body });
                    await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                } else if (channel === 'WhatsApp' && recipient_phone) {
                    await sendWhatsappMessage(req.tenantId, recipient_phone, body);
                    await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                }
            } catch (sendErr: any) {
                // Real send failed — mark as Failed but don't break the response
                await pool.query(`UPDATE notifications SET status='Failed' WHERE id=$1`, [rows[0].id]);
                errors.push({ channel, error: sendErr.message });
            }
        }

        res.json({
            sent: inserted.length,
            records: inserted,
            send_errors: errors,
            message: errors.length
                ? `Logged but some sends failed: ${errors.map(e => e.channel).join(', ')}`
                : `Successfully sent via ${channels.join(', ')}`,
        });
    } catch (err) {
        console.error('POST /notifications/send error:', err);
        res.status(500).json({ error: 'Failed to log notification' });
    }
});

// ─── POST /api/notifications/nurture-draft — Specialized AI draft for Nurture stage ────
router.post('/nurture-draft', async (req: any, res: Response) => {
    try {
        const { lead_id, channel } = req.body;
        if (!lead_id) return res.status(400).json({ error: 'Lead ID required' });

        const leadRes = await pool.query('SELECT * FROM leads WHERE id=$1 AND tenant_id=$2', [lead_id, req.tenantId]);
        const lead = leadRes.rows[0];
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const { generateAIResponse } = await import('../../utils/ai');

        const prompt = `
            You are a senior real estate relationship manager at Zentrix Realty.
            Draft a empathetic and non-pushy ${channel || 'WhatsApp'} message for a lead named ${lead.name} who is in the "Nurture" stage.
            
            Nurture Reason: ${lead.nurture_reason || 'General Follow-up'}
            Budget: ${lead.budget || 'Market Rate'}
            Project: ${lead.property_type || 'Residential'}
            
            Strategy based on Nurture Reason:
            - If "Budget issue": Offer a flexible payment plan or a newer, more affordable unit.
            - If "No response": Send a gentle "Are you still looking?" message with a value-add (like a market report).
            - If "Timeline delay": Ask if their timeline has shifted and offer to share updated site photos.
            - If "General": Share a recent success story or a new project highlight.
            
            Guidelines:
            - Concise (under 60 words).
            - Personal and warm.
            - No placeholders. Sign off as "Team Zentrix".
        `;

        const draft = await generateAIResponse(prompt, false);
        res.json({ draft });
    } catch (err) {
        console.error('Nurture draft error:', err);
        res.status(500).json({ error: 'Failed to generate nurture draft' });
    }
});

// ─── POST /api/notifications/draft-reply — AI generated draft ────
router.post('/draft-reply', async (req: any, res: Response) => {
    try {
        const { lead_id, channel, context } = req.body;
        if (!lead_id) return res.status(400).json({ error: 'Lead ID required' });

        // Get lead context
        const leadRes = await pool.query('SELECT * FROM leads WHERE id=$1 AND tenant_id=$2', [lead_id, req.tenantId]);
        const lead = leadRes.rows[0];
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        // Get last few interactions
        const histRes = await pool.query('SELECT body, channel, sent_at FROM notifications WHERE lead_id=$1 ORDER BY sent_at DESC LIMIT 5', [lead_id]);
        const history = histRes.rows.map((h: any) => `${h.channel}: ${h.body}`).join('\n');

        const { generateAIResponse } = await import('../../utils/ai');

        const prompt = `
            You are a senior real estate sales assistant at Zentrix Realty.
            Draft a professional and persuasive ${channel} message for a lead named ${lead.name}.
            
            Lead Status: ${lead.stage}
            Interest: ${lead.property_type || 'Residential Property'}
            Budget: ${lead.budget || 'Premium'}
            
            History:
            ${history}
            
            Context of the reply: ${context || 'Following up on their interest.'}
            
            Guidelines:
            - Concise and friendly.
            - Call to action included.
            - No placeholders like [Agent Name], sign off as "Team Zentrix".
        `;

        const draft = await generateAIResponse(prompt, false);

        res.json({ draft });
    } catch (err) {
        console.error('Draft reply error:', err);
        res.status(500).json({ error: 'Failed to generate draft' });
    }
});

// ─── POST /api/notifications/bulk-send — log + send to multiple ────
router.post('/bulk-send', async (req: any, res: Response) => {
    try {
        const { channels, recipients, subject, body } = req.body;
        if (!body || !channels?.length || !recipients?.length)
            return res.status(400).json({ error: 'Body, channels, and recipients are required' });

        const inserted = [];
        let errorsCount = 0;

        for (const recipient of recipients) {
            for (const channel of channels) {
                const target = channel === 'Email' ? recipient.email : recipient.phone;
                if (!target) continue; // skip if lead missing email/phone

                // Resolve template vars for this specific recipient
                const varMap: any = {
                    '{{name}}': recipient.name || 'Customer',
                    '{{first_name}}': (recipient.name || 'Customer').split(' ')[0],
                    '{{phone}}': recipient.phone || '',
                    '{{company}}': 'Zentrix Realty Pvt. Ltd.'
                };
                const resolvedBody = Object.entries(varMap).reduce((t: string, [k, v]) => t.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v as string), body);
                const resolvedSubject = Object.entries(varMap).reduce((t: string, [k, v]) => t.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v as string), subject || '');

                const { rows } = await pool.query(
                    `INSERT INTO notifications (tenant_id, sent_by, lead_id, channel, recipient, subject, body, status)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
                    [req.tenantId, req.user.id, recipient.id || null, channel,
                    target || recipient.name, resolvedSubject || null, resolvedBody, 'Sent']
                );
                inserted.push(rows[0]);

                if (recipient.id) {
                    try {
                        await pool.query(
                            `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note)
                             VALUES ($1, $2, $3, $4, NOW(), $5)`,
                            [req.tenantId, recipient.id, req.user.id, channel, `Outbound ${channel} Message (Bulk):\n\n${resolvedBody}`]
                        );
                    } catch (interactionErr: any) {
                        console.error('Failed to log bulk notification to timeline:', interactionErr.message);
                    }
                }

                try {
                    if (channel === 'Email' && recipient.email) {
                        await sendEmail(req.tenantId, { to: recipient.email, subject: resolvedSubject || 'Message from ZentrixCRM', html: resolvedBody });
                        await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                    } else if (channel === 'SMS' && recipient.phone) {
                        await sendSMS({ to: recipient.phone, body: resolvedBody });
                        await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                    } else if (channel === 'WhatsApp' && recipient.phone) {
                        await sendWhatsappMessage(req.tenantId, recipient.phone, resolvedBody);
                        await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                    }
                } catch (_sendErr) {
                    await pool.query(`UPDATE notifications SET status='Failed' WHERE id=$1`, [rows[0].id]);
                    errorsCount++;
                }
            }
        }

        res.json({
            sent: inserted.length - errorsCount,
            total: inserted.length,
            message: `Processed ${inserted.length} notifications. ${errorsCount ? `(${errorsCount} failed to deliver)` : ''}`,
        });
    } catch (err) {
        console.error('POST /notifications/bulk-send error:', err);
        res.status(500).json({ error: 'Failed to process bulk notifications' });
    }
});

// ─── PATCH /api/notifications/:id — update status ─────────────────
router.patch('/:id', requireManager, async (req: any, res: Response) => {
    try {
        const { status } = req.body;
        const { rows } = await pool.query(
            `UPDATE notifications SET status=$1 WHERE id=$2 AND tenant_id=$3 RETURNING *`,
            [status, req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
        res.json(rows[0]);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

export default router;
