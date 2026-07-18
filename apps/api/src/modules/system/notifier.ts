import { db as firebaseDb } from '../../utils/firebase';
import { sendPushNotification } from '../../utils/push';
import pool from '../../db/pool';

/**
 * ZentrixCRM Universal Notifier
 * Orchestrates business notifications (Email, WhatsApp, Push)
 */

export const sendPushToUser = async (tenantId: string, userId: string, payload: { title: string; body: string; icon?: string; data?: any }) => {
    try {
        // 1. Send to Web Push (Service Workers)
        const { rows: subscriptions } = await pool.query(
            `SELECT * FROM push_subscriptions WHERE user_id = $1 AND tenant_id = $2`,
            [userId, tenantId]
        );

        for (const sub of subscriptions) {
            await sendPushNotification(sub, payload);
        }

        // 2. Send to Mobile (Firebase RTDB Node for WtiService)
        if (firebaseDb) {
            // Get agent name for this user (usually stored in telephony_agent_id or name)
            const { rows: users } = await pool.query('SELECT name, telephony_agent_id FROM users WHERE id = $1', [userId]);
            const agentName = users[0]?.telephony_agent_id || users[0]?.name?.replace(/\s+/g, '_') || 'Agent_001';
            
            await firebaseDb.ref(`agents/${agentName}/notifications`).push({
                ...payload,
                timestamp: Date.now(),
                status: 'unread'
            });
        }

        return true;
    } catch (err) {
        console.error('[NOTIFIER] Push failed:', err);
        return false;
    }
};

export const sendFollowupPush = async (tenantId: string, userId: string, leadName: string, time: string) => {
    return sendPushToUser(tenantId, userId, {
        title: '⏰ Follow-up Due Now',
        body: `Your call with ${leadName} was scheduled for ${time}.`,
        icon: '/logo192.png',
        data: { url: '/nurture-leads' }
    });
};

export const sendWelcomeEmail = async (user: { name: string; email: string }, workspace: { name: string; slug: string }) => {
    // In production, integrate with SendGrid / Postmark / Amazon SES
    const message = `
        WELCOME TO THE DYNASTY, ${user.name.toUpperCase()}!
        
        Your private CRM node has been successfully provisioned.
        
        Workspace: ${workspace.name}
        Identity: ${workspace.slug}.zentrixcrm.com
        Login Email: ${user.email}
        
        Access your command center here: https://${workspace.slug}.zentrixcrm.com
        
        Regards,
        The Zentrix Infrastructure Team
    `;

    console.log('--- [OUTBOUND EMAIL] ---');
    console.log(message);
    console.log('------------------------');

    return true;
};

export const sendReferralAlert = async (referrerName: string, refereeName: string) => {
    const message = `
        GREAT NEWS, ${referrerName}!
        
        You just brought ${refereeName} into the Zentrix ecosystem. 
        Your account has been flagged for a 30-day billing credit.
        
        Check your Referral Dashboard in the CRM for details.
    `;
    
    console.log('--- [OUTBOUND ALERT] ---');
    console.log(message);
    console.log('------------------------');
    
    return true;
};

