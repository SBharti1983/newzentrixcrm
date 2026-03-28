const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── Role guard ──────────────────────────────────────────────────────
const requireManager = (req, res, next) => {
    if (!['admin', 'sales_manager'].includes(req.user.role))
        return res.status(403).json({ error: 'Manager or Admin only' });
    next();
};

// ─── GET /api/notifications/conversations — grouped by lead ───────
router.get('/conversations', async (req, res) => {
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
router.get('/', async (req, res) => {
    try {
        const { channel, lead_id, limit = 100, offset = 0 } = req.query;
        let q = `
            SELECT n.*, u.name as sent_by_name, l.name as lead_name
            FROM notifications n
            LEFT JOIN users u ON n.sent_by = u.id
            LEFT JOIN leads l ON n.lead_id = l.id
            WHERE n.tenant_id = $1
        `;
        const params = [req.tenantId];
        if (channel) { q += ` AND n.channel = $${params.length + 1}`; params.push(channel); }
        if (lead_id) { q += ` AND n.lead_id = $${params.length + 1}`; params.push(lead_id); }
        q += ` ORDER BY n.sent_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

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

// ─── POST /api/notifications/send — log + (optionally) send ───────
router.post('/send', async (req, res) => {
    try {
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

            // 2. Attempt real send (graceful — if env vars missing, just log)
            try {
                if (channel === 'Email' && recipient_email) {
                    await sendEmail({ to: recipient_email, subject: subject || 'Message from ZentrixCRM', body });
                    await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                } else if (channel === 'SMS' && recipient_phone) {
                    await sendSMS({ to: recipient_phone, body });
                    await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                } else if (channel === 'WhatsApp' && recipient_phone) {
                    await sendWhatsApp({ to: recipient_phone, body });
                    await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                }
            } catch (sendErr) {
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

// ─── POST /api/notifications/draft-reply — AI generated draft ────
router.post('/draft-reply', async (req, res) => {
    try {
        const { lead_id, channel, context } = req.body;
        if (!lead_id) return res.status(400).json({ error: 'Lead ID required' });

        // Get lead context
        const leadRes = await pool.query('SELECT * FROM leads WHERE id=$1 AND tenant_id=$2', [lead_id, req.tenantId]);
        const lead = leadRes.rows[0];
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        // Get last few interactions
        const histRes = await pool.query('SELECT body, channel, sent_at FROM notifications WHERE lead_id=$1 ORDER BY sent_at DESC LIMIT 5', [lead_id]);
        const history = histRes.rows.map(h => `${h.channel}: ${h.body}`).join('\n');

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

        const result = await model.generateContent(prompt);
        const draft = result.response.text();

        res.json({ draft });
    } catch (err) {
        console.error('Draft reply error:', err);
        res.status(500).json({ error: 'Failed to generate draft' });
    }
});

// ─── POST /api/notifications/bulk-send — log + send to multiple ────
router.post('/bulk-send', async (req, res) => {
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
                const varMap = {
                    '{{name}}': recipient.name || 'Customer',
                    '{{first_name}}': (recipient.name || 'Customer').split(' ')[0],
                    '{{phone}}': recipient.phone || '',
                    '{{company}}': 'Zentrix Realty Pvt. Ltd.'
                };
                const resolvedBody = Object.entries(varMap).reduce((t, [k, v]) => t.replaceAll(k, v), body);
                const resolvedSubject = Object.entries(varMap).reduce((t, [k, v]) => t.replaceAll(k, v), subject || '');

                const { rows } = await pool.query(
                    `INSERT INTO notifications (tenant_id, sent_by, lead_id, channel, recipient, subject, body, status)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
                    [req.tenantId, req.user.id, recipient.id || null, channel,
                    target || recipient.name, resolvedSubject || null, resolvedBody, 'Sent']
                );
                inserted.push(rows[0]);

                try {
                    if (channel === 'Email' && recipient.email) {
                        await sendEmail({ to: recipient.email, subject: resolvedSubject || 'Message from ZentrixCRM', body: resolvedBody });
                        await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                    } else if (channel === 'SMS' && recipient.phone) {
                        await sendSMS({ to: recipient.phone, body: resolvedBody });
                        await pool.query(`UPDATE notifications SET status='Delivered' WHERE id=$1`, [rows[0].id]);
                    } else if (channel === 'WhatsApp' && recipient.phone) {
                        await sendWhatsApp({ to: recipient.phone, body: resolvedBody });
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
router.patch('/:id', requireManager, async (req, res) => {
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

// ─── Actual send helpers ───────────────────────────────────────────
async function sendEmail({ to, subject, body }) {
    const nodemailer = require('nodemailer');
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER)
        throw new Error('SMTP not configured');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'ZentrixCRM'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
    });
}

async function sendSMS({ to, body }) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)
        throw new Error('Twilio SMS not configured');

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
    });
}

async function sendWhatsApp({ to, body }) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_WHATSAPP_FROM)
        throw new Error('Twilio WhatsApp not configured');

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to: `whatsapp:${to}`,
    });
}

module.exports = router;
