/**
 * Quick test for Email (SMTP) and WhatsApp (Whapi Cloud) integration
 */
require('dotenv').config({ path: __dirname + '/.env' });

async function testEmail() {
    console.log('\n📧 ═══ TESTING EMAIL (SMTP) ═══');
    console.log(`   SMTP Host: ${process.env.SMTP_HOST}`);
    console.log(`   SMTP User: ${process.env.SMTP_USER}`);
    console.log(`   From Name: ${process.env.SMTP_FROM_NAME}`);

    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // send to self
            subject: '✅ ZentrixCRM Email Test — Maya Infratech',
            text: 'This is a test email from ZentrixCRM. If you can read this, SMTP integration is working!',
            html: '<h2>✅ Email Integration Working!</h2><p>This is a test email from <b>ZentrixCRM</b>.</p><p>SMTP is configured correctly for <b>Maya Infratech</b>.</p>',
        });

        console.log('   ✅ EMAIL SENT SUCCESSFULLY!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Accepted: ${info.accepted.join(', ')}`);
    } catch (err) {
        console.error('   ❌ EMAIL FAILED:', err.message);
    }
}

async function testWhatsApp() {
    console.log('\n💬 ═══ TESTING WHATSAPP (Whapi Cloud) ═══');
    console.log(`   API URL: ${process.env.WHAPI_API_URL}`);
    console.log(`   Token: ${process.env.WHAPI_TOKEN?.slice(0, 8)}...`);

    try {
        // First check channel health
        const healthRes = await fetch(`${process.env.WHAPI_API_URL}/health`, {
            headers: { 'Authorization': `Bearer ${process.env.WHAPI_TOKEN}` }
        });
        const health = await healthRes.json();
        console.log(`   Channel Status: ${JSON.stringify(health.status || health)}`);

        // Send a test message to the user's own number
        const testPhone = '917765060907'; // User's number
        const chatId = `${testPhone}@s.whatsapp.net`;

        const res = await fetch(`${process.env.WHAPI_API_URL}/messages/text`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: chatId,
                body: '✅ ZentrixCRM WhatsApp Test — Maya Infratech integration is live!'
            }),
        });

        const result = await res.json();
        if (res.ok) {
            console.log('   ✅ WHATSAPP MESSAGE SENT!');
            console.log(`   Message ID: ${result.message?.id || result.sent?.id || JSON.stringify(result).slice(0, 100)}`);
        } else {
            console.error('   ❌ WHATSAPP FAILED:', res.status, JSON.stringify(result));
        }
    } catch (err) {
        console.error('   ❌ WHATSAPP ERROR:', err.message);
    }
}

(async () => {
    console.log('🔧 ZentrixCRM Integration Test Suite');
    console.log('════════════════════════════════════════');
    await testEmail();
    await testWhatsApp();
    console.log('\n════════════════════════════════════════');
    console.log('🏁 Tests complete.\n');
    process.exit(0);
})();
