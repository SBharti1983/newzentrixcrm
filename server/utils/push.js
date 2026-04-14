const webpush = require('web-push');

// Generate these once and save in .env
// We'll use these dummy ones for now
const vapidKeys = {
    publicKey: 'BJ9_lX3Q8v7lV1_Z1h6G5pQ6V_a9a_8_6_6_a_a_a_a_a_a_a_a_a_a_a_a', // Placeholder
    privateKey: 'placeholder_private_key'
};

// In a real app, generate using: webpush.generateVAPIDKeys()
// And load from: 
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || vapidKeys.publicKey;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || vapidKeys.privateKey;

try {
    if (PUBLIC_KEY && PRIVATE_KEY && PUBLIC_KEY !== 'placeholder' && PRIVATE_KEY !== 'placeholder') {
        webpush.setVapidDetails(
            'mailto:support@zentrixcrm.com',
            PUBLIC_KEY,
            PRIVATE_KEY
        );
        console.log('[PUSH] VAPID details initialized successfully');
    } else {
        console.warn('[PUSH] VAPID keys missing or placeholder—push notifications disabled');
    }
} catch (err) {
    console.error('[PUSH] Failed to set VAPID details—push notifications disabled:', err.message);
}

const sendPushNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth
                }
            },
            JSON.stringify(payload)
        );
        return { success: true };
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error };
    }
};

module.exports = { sendPushNotification, PUBLIC_KEY };
