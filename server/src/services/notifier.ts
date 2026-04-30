/**
 * ZentrixCRM Universal Notifier
 * Orchestrates business notifications (Email, WhatsApp, Push)
 */

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

