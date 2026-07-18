import express, { Request, Response } from 'express';
import { db, siteVisits, leads, projects, users } from '../../../db';
import { eq, and } from 'drizzle-orm';
import { authenticateToken } from '../../../middleware/auth';
import { sendWhatsappMessage } from '../../../utils/whatsapp';
import { sendEmail } from '../../../utils/email';

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/site-visits/schedule
 * Schedules a new site visit and triggers automated notifications
 */
router.post('/schedule', async (req: any, res: Response) => {
    const { lead_id, project_id, scheduled_at, transport, notes, assigned_agent } = req.body;
    const tenantId = req.tenantId;

    try {
        // 1. Create the site visit record
        const [newVisit] = await db.insert(siteVisits).values({
            tenantId,
            leadId: lead_id,
            projectId: project_id,
            assignedAgent: assigned_agent || req.user.id,
            scheduledAt: scheduled_at,
            transport: transport || 'Self',
            notes: notes || '',
            status: 'Scheduled'
        }).returning();

        // 2. Fetch Lead, Project, and Agent details for personalized messages
        const [lead] = await db.select().from(leads).where(and(eq(leads.id, lead_id), eq(leads.tenantId, tenantId))).limit(1);
        const [project] = await db.select().from(projects).where(and(eq(projects.id, project_id), eq(projects.tenantId, tenantId))).limit(1);
        const [agent] = await db.select().from(users).where(and(eq(users.id, assigned_agent || req.user.id), eq(users.tenantId, tenantId))).limit(1);

        if (lead && project) {
            const formattedDate = new Date(scheduled_at).toLocaleString('en-IN', { 
                dateStyle: 'full', 
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata'
            });

            const whatsappMsg = `Hi ${lead.name},\n\nYour site visit for *${project.name}* is scheduled for *${formattedDate}*.\n\n📍 Location: ${project.location || 'Site office'}\n👤 Coordinator: ${agent?.name || 'Our representative'}\n🚗 Transport: ${transport || 'Self'}\n\nWe look forward to showing you your future home! \n- Zentrix Realty`;

            // 3. Trigger Automated Notifications (Async)
            if (lead.phone) {
                sendWhatsappMessage(tenantId, lead.phone, whatsappMsg).catch(e => console.error('SiteVisit WA Error:', e));
            }

            if (lead.email) {
                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #1e3a73;">Site Visit Confirmed!</h2>
                        <p>Hi <b>${lead.name}</b>,</p>
                        <p>Your site visit for <b>${project.name}</b> has been successfully scheduled.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p>📅 <b>Date & Time:</b> ${formattedDate}</p>
                            <p>📍 <b>Location:</b> ${project.location || 'Site office'}</p>
                            <p>👤 <b>Coordinator:</b> ${agent?.name || 'Zentrix Specialist'}</p>
                            <p>🚗 <b>Transport:</b> ${transport || 'Self'}</p>
                        </div>
                        <p>If you need to reschedule, please contact us at ${agent?.email || 'support@zentrixcrm.in'}.</p>
                        <p>See you there!</p>
                        <hr style="border: none; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #999;">Powered by ZentrixCRM Proactive Intelligence</p>
                    </div>
                `;
                sendEmail(tenantId, { 
                    to: lead.email, 
                    subject: `Confirmed: Site Visit for ${project.name}`, 
                    html: emailHtml 
                }).catch(e => console.error('SiteVisit Email Error:', e));
            }
        }

        res.status(201).json(newVisit);
    } catch (err: any) {
        console.error('Failed to schedule site visit:', err);
        res.status(500).json({ error: 'Failed to schedule visit: ' + err.message });
    }
});

/**
 * GET /api/site-visits
 * Returns all site visits for the tenant
 */
router.get('/', async (req: any, res: Response) => {
    try {
        const visits = await db.select({
            id: siteVisits.id,
            scheduledAt: siteVisits.scheduledAt,
            status: siteVisits.status,
            transport: siteVisits.transport,
            notes: siteVisits.notes,
            leadName: leads.name,
            leadPhone: leads.phone,
            projectName: projects.name,
            agentName: users.name
        })
        .from(siteVisits)
        .leftJoin(leads, eq(siteVisits.leadId, leads.id))
        .leftJoin(projects, eq(siteVisits.projectId, projects.id))
        .leftJoin(users, eq(siteVisits.assignedAgent, users.id))
        .where(eq(siteVisits.tenantId, req.tenantId))
        .orderBy(siteVisits.scheduledAt);

        res.json(visits);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch site visits' });
    }
});

export default router;
