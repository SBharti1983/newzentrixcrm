// ─── Notification Channels ──────────────────────────────────────────────────
export const CHANNELS = {
    sms: {
        id: 'sms',
        label: 'SMS',
        icon: '📱',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.1)',
        maxLength: 160,
        badge: 'badge-green',
    },
    email: {
        id: 'email',
        label: 'Email',
        icon: '📧',
        color: '#3b63b8',
        bg: 'rgba(59,99,184,0.1)',
        maxLength: 5000,
        badge: 'badge-blue',
    },
    whatsapp: {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: '💬',
        color: '#25d366',
        bg: 'rgba(37,211,102,0.1)',
        maxLength: 1024,
        badge: 'badge-green',
    },
};

// ─── Template Variables (resolved at compose time) ──────────────────────────
export const TEMPLATE_VARS = [
    { key: '{{name}}', label: 'Customer Name' },
    { key: '{{agent}}', label: 'Agent Name' },
    { key: '{{project}}', label: 'Project Name' },
    { key: '{{date}}', label: 'Date' },
    { key: '{{time}}', label: 'Time' },
    { key: '{{budget}}', label: 'Budget' },
    { key: '{{unit}}', label: 'Unit No.' },
    { key: '{{phone}}', label: 'Phone' },
    { key: '{{company}}', label: 'Company Name' },
];

// ─── Message Templates ─────────────────────────────────────────────────────
export const TEMPLATES = [
    // ── Site Visit ──────────────────────────────────────────────────────────
    {
        id: 'site_visit_reminder',
        category: 'Site Visit',
        name: 'Visit Reminder',
        channels: ['sms', 'whatsapp', 'email'],
        subject: 'Your Site Visit is Confirmed — {{project}}',
        body: `Dear {{name}},

Your site visit to *{{project}}* has been confirmed for *{{date}} at {{time}}*.

Our agent *{{agent}}* will be your dedicated guide for the visit.

📍 What to bring: Valid ID proof
🚗 Transport: Arranged by our team

For any queries, please call us at +91 22 4567 8900.

Warm regards,
Zentrix Realty Pvt. Ltd.`,
        sms: `Hi {{name}}, your site visit to {{project}} is confirmed for {{date}} at {{time}}. Agent {{agent}} will accompany you. Zentrix Realty.`,
    },
    {
        id: 'site_visit_followup',
        category: 'Site Visit',
        name: 'Post-Visit Follow-Up',
        channels: ['whatsapp', 'email', 'sms'],
        subject: 'How was your visit to {{project}}?',
        body: `Dear {{name}},

Thank you for visiting *{{project}}* on {{date}}!

We hope you loved what you saw. 🏠

To help you take the next step, our team has put together:
✅ Detailed floor plans
✅ Price sheet & payment plans
✅ Virtual 3D tour

Would you like to schedule a follow-up call with {{agent}}? Simply reply YES to this message.

Zentrix Realty Pvt. Ltd.`,
        sms: `Hi {{name}}, thanks for visiting {{project}}! Interested in the next steps? Reply YES or call us. - Zentrix Realty.`,
    },

    // ── Follow-Up ────────────────────────────────────────────────────────────
    {
        id: 'followup_call',
        category: 'Follow-Up',
        name: 'Call Follow-Up',
        channels: ['sms', 'whatsapp', 'email'],
        subject: 'Following up on your property enquiry — {{project}}',
        body: `Dear {{name}},

I'm {{agent}} from Zentrix Realty. I wanted to follow up on your enquiry for *{{project}}*.

We currently have excellent options within your budget of *{{budget}}* that I believe you'll love.

I'll call you on *{{date}} at {{time}}* — please keep your phone handy!

Alternatively, you can reach me directly at +91 22 4567 8900.

Best regards,
{{agent}}
Zentrix Realty`,
        sms: `Hi {{name}}, this is {{agent}} from Zentrix Realty. I'll call you on {{date}} at {{time}} regarding {{project}}. Looking forward to speaking!`,
    },
    {
        id: 'followup_price_update',
        category: 'Follow-Up',
        name: 'Price Update Alert',
        channels: ['sms', 'whatsapp', 'email'],
        subject: '🔔 Price Update: {{project}} — Limited Period Offer',
        body: `Dear {{name}},

We have an exciting update for you regarding *{{project}}*!

🎉 *Special Limited-Period Pricing Available*

With your target budget of *{{budget}}*, we now have hand-picked units that are a perfect match.

Offer valid until {{date}} only.

Contact {{agent}} now to lock in this price before it's gone!

📞 +91 22 4567 8900

Zentrix Realty Pvt. Ltd.`,
        sms: `ALERT: {{project}} price update! Units within {{budget}} available. Limited period. Call {{agent}} now or visit Zentrix Realty. Offer ends {{date}}.`,
    },

    // ── Booking ──────────────────────────────────────────────────────────────
    {
        id: 'booking_confirmation',
        category: 'Booking',
        name: 'Booking Confirmation',
        channels: ['email', 'whatsapp', 'sms'],
        subject: '✅ Booking Confirmed — Unit {{unit}}, {{project}}',
        body: `Dear {{name}},

*Congratulations! 🎉 Your booking is confirmed.*

📋 *Booking Details:*
• Project: {{project}}
• Unit No.: {{unit}}
• Booking Date: {{date}}
• Your Agent: {{agent}}

*Next Steps:*
1. Complete KYC documentation within 7 days
2. Pay maintenance deposit
3. Schedule agreement signing

Our team will reach out within 24 hours to guide you through the documentation process.

Thank you for choosing Zentrix Realty!

{{agent}} | Zentrix Realty Pvt. Ltd.`,
        sms: `Congrats {{name}}! Your booking for Unit {{unit}} at {{project}} is confirmed. Contact {{agent}} for next steps. Zentrix Realty.`,
    },
    {
        id: 'payment_reminder',
        category: 'Booking',
        name: 'Payment Reminder',
        channels: ['sms', 'email', 'whatsapp'],
        subject: 'Action Required: Payment Due — {{project}} Unit {{unit}}',
        body: `Dear {{name}},

This is a friendly reminder that your next payment installment for *Unit {{unit}}, {{project}}* is due on *{{date}}*.

💰 Please ensure the payment is processed before the due date to avoid any delays in the registration process.

Payment Options:
• NEFT / RTGS to our escrow account
• Cheque payable to Zentrix Realty Pvt. Ltd.
• Online payment portal: pay.zentrixrealty.com

For assistance, contact {{agent}} at +91 22 4567 8900.

Zentrix Realty Pvt. Ltd.`,
        sms: `Reminder: Payment for Unit {{unit}} at {{project}} is due on {{date}}. Contact {{agent}} for payment details. Zentrix Realty.`,
    },

    // ── General ──────────────────────────────────────────────────────────────
    {
        id: 'welcome_new_lead',
        category: 'General',
        name: 'Welcome New Lead',
        channels: ['whatsapp', 'email'],
        subject: 'Welcome to Zentrix Realty — Let us find your dream home!',
        body: `Dear {{name}},

Thank you for reaching out to *Zentrix Realty*! 🏠

We're delighted to have you as our valued customer. Your dedicated relationship manager is *{{agent}}*, who will personally guide you through our premium property portfolio.

🌟 *Why Zentrix Realty?*
• 7+ premium projects across India
• Transparent pricing with no hidden costs
• End-to-end home buying assistance
• Trusted by 500+ happy families

We'll reach out shortly to understand your requirements better.

Welcome aboard!

{{agent}} | Zentrix Realty Pvt. Ltd.
📞 +91 22 4567 8900`,
        sms: `Welcome to Zentrix Realty, {{name}}! Your agent {{agent}} will contact you shortly. Dream homes, delivered. - Zentrix Realty.`,
    },
    {
        id: 'general_custom',
        category: 'General',
        name: 'Custom Message',
        channels: ['sms', 'whatsapp', 'email'],
        subject: '',
        body: '',
        sms: '',
    },
];

// ─── Notification Log Seed Data ────────────────────────────────────────────
export const NOTIFICATION_LOG_SEED = [
    {
        id: 1,
        channel: 'whatsapp',
        recipient: 'Kiran Reddy',
        phone: '+91 54321 09876',
        email: 'kiran.reddy@gmail.com',
        template: 'Booking Confirmation',
        subject: '✅ Booking Confirmed — Unit V-002, Zentrix Villas',
        preview: 'Congratulations! Your booking for Unit V-002 at Zentrix Villas is confirmed...',
        sentAt: '2026-02-14 14:30',
        sentBy: 'Neha Gupta',
        status: 'delivered',
        leadId: 5,
    },
    {
        id: 2,
        channel: 'email',
        recipient: 'Anita Patel',
        phone: '+91 87654 32109',
        email: 'anita.patel@yahoo.com',
        template: 'Site Visit Reminder',
        subject: 'Your Site Visit is Confirmed — Zentrix Residences',
        preview: 'Dear Anita, Your site visit to Zentrix Residences has been confirmed for 2026-02-21...',
        sentAt: '2026-02-17 09:15',
        sentBy: 'Neha Gupta',
        status: 'delivered',
        leadId: 2,
    },
    {
        id: 3,
        channel: 'sms',
        recipient: 'Rajesh Kumar',
        phone: '+91 98765 43210',
        email: 'rajesh.kumar@gmail.com',
        template: 'Call Follow-Up',
        subject: null,
        preview: 'Hi Rajesh, this is Rohan from Zentrix Realty. I\'ll call you on 2026-02-20...',
        sentAt: '2026-02-18 11:00',
        sentBy: 'Rohan Verma',
        status: 'delivered',
        leadId: 1,
    },
    {
        id: 4,
        channel: 'whatsapp',
        recipient: 'Dev Malhotra',
        phone: '+91 99876 54321',
        email: 'dev.malhotra@corp.in',
        template: 'Price Update Alert',
        subject: null,
        preview: 'Dear Dev, We have an exciting update regarding Zentrix Residences!...',
        sentAt: '2026-02-19 08:45',
        sentBy: 'Vikram Singh',
        status: 'delivered',
        leadId: 10,
    },
    {
        id: 5,
        channel: 'email',
        recipient: 'Suresh Bhat',
        phone: '+91 76543 21098',
        email: 'suresh.bhat@hotmail.com',
        template: 'Visit Reminder',
        subject: 'Your Site Visit is Confirmed — Zentrix Park',
        preview: 'Dear Suresh, Your site visit to Zentrix Park is confirmed for 2026-02-22...',
        sentAt: '2026-02-19 10:30',
        sentBy: 'Rohan Verma',
        status: 'pending',
        leadId: 3,
    },
];
