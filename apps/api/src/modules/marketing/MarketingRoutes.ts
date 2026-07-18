import express, { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/auth';
import { generateAIResponse } from '../../utils/ai';
import { sendWhatsappMessage } from '../../utils/whatsapp';
import aiService from '../ai/orchestration/AiService';

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/marketing/ai-personalized-broadcast
 * Runs a bulk campaign with unique AI personalization for every lead
 */
router.post('/ai-personalized-broadcast', async (req: any, res: Response) => {
    const { name: campaignName, goal, lead_ids } = req.body;

    try {
        // 1. Create campaign record
        const { rows: campaign } = await db.execute(sql`
            INSERT INTO whatsapp_campaigns (tenant_id, name, message_body, recipients_count, status, sent_at) 
             VALUES (${req.tenantId}, ${campaignName}, ${'AI Personalized Mode'}, ${lead_ids.length}, 'Personalizing...', NOW()) RETURNING *
        `);

        // 2. Background Personalization & Dispatch
        (async () => {
            try {
                // Fetch lead details with project info
                const { rows: leads } = await db.execute(sql`
                    SELECT l.id, l.name, l.phone, l.stage, p.name as project_name 
                    FROM leads l 
                    LEFT JOIN projects p ON l.project_id = p.id
                    WHERE l.id = ANY(${lead_ids})
                `) as { rows: any[] };

                // AI Batch Generation
                const messages = await aiService.generatePersonalizedBulkMessages(leads, goal);

                let successCount = 0;
                for (const entry of messages) {
                    const lead = leads.find(l => l.id === entry.id);
                    if (!lead || !lead.phone) continue;

                    const sent = await sendWhatsappMessage(req.tenantId, lead.phone, entry.message);
                    if (sent) successCount++;

                    await db.execute(sql`
                        INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
                         VALUES (${req.tenantId}, ${lead.id}, ${req.user.id}, 'Message', NOW(), ${`AI Bulk Personalized: ${campaignName}\nGoal: ${goal}\nMessage: ${entry.message}`}, 'Delivered')
                    `);
                }

                await db.execute(sql`
                    UPDATE whatsapp_campaigns SET status = 'Completed', updated_at = NOW() WHERE id = ${campaign[0].id}
                `);
            } catch (innerErr) {
                console.error('[Bulk AI] Background dispatch failed:', innerErr);
                await db.execute(sql`
                    UPDATE whatsapp_campaigns SET status = 'Failed', updated_at = NOW() WHERE id = ${campaign[0].id}
                `);
            }
        })();

        res.status(201).json(campaign[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initiate AI broadcast' });
    }
});

// GET /api/marketing/drips
router.get('/drips', async (req: any, res: Response) => {
    try {
        const { rows } = await db.execute(sql`
            SELECT c.*, 
                (SELECT COUNT(*) FROM drip_steps WHERE campaign_id = c.id) as steps_count,
                (SELECT COUNT(*) FROM drip_enrollments WHERE campaign_id = c.id) as enrolled_count
             FROM drip_campaigns c 
             WHERE c.tenant_id = ${req.tenantId} 
             ORDER BY c.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch drips' });
    }
});

// POST /api/marketing/drips
router.post('/drips', async (req: any, res: Response) => {
    const { name, description, steps } = req.body;

    try {
        const newCampaign = await db.transaction(async (tx) => {
            const { rows: campaignRows } = await tx.execute(sql`
                INSERT INTO drip_campaigns (tenant_id, name, description) 
                 VALUES (${req.tenantId}, ${name}, ${description}) RETURNING *
            `);

            const campaignId = campaignRows[0].id;

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                await tx.execute(sql`
                    INSERT INTO drip_steps (campaign_id, step_order, delay_days, delay_hours, channel, body, subject, is_ab_test, body_b, subject_b)
                     VALUES (${campaignId}, ${i + 1}, ${step.delay_days || 0}, ${step.delay_hours || 0}, ${step.channel}, ${step.body}, ${step.subject || ''}, ${step.is_ab_test || false}, ${step.body_b || ''}, ${step.subject_b || ''})
                `);
            }
            
            return campaignRows[0];
        });

        res.status(201).json(newCampaign);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create drip campaign' });
    }
});

// GET /api/marketing/drips/:id/analytics
router.get('/drips/:id/analytics', async (req: any, res: Response) => {
    try {
        const { rows: steps } = await db.execute(sql`
            SELECT * FROM drip_steps WHERE campaign_id = ${req.params.id} ORDER BY step_order
        `);

        const { rows: totals } = await db.execute(sql`
            SELECT 
                COUNT(*) filter (where event_type = 'sent') as total_sent,
                COUNT(*) filter (where event_type = 'opened') as total_opened,
                COUNT(*) filter (where event_type = 'clicked') as total_clicked
             FROM drip_events WHERE campaign_id = ${req.params.id}
        `);

        res.json({ steps, overall: totals[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// POST /api/marketing/drips/:id/enroll
router.post('/drips/:id/enroll', async (req: any, res: Response) => {
    const { leadIds } = req.body;
    const { id: campaignId } = req.params;

    try {
        const { rows: firstStep } = await db.execute(sql`
            SELECT * FROM drip_steps WHERE campaign_id = ${campaignId} AND step_order = 1
        `);

        if (!firstStep[0]) return res.status(400).json({ error: 'Campaign has no steps' });

        for (const leadId of leadIds) {
            const { rows: existing } = await db.execute(sql`
                SELECT id FROM drip_enrollments WHERE campaign_id = ${campaignId} AND lead_id = ${leadId}
            `);

            if (existing.length > 0) continue;

            const nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + (Number(firstStep[0].delay_days) || 0));
            nextRun.setHours(nextRun.getHours() + (Number(firstStep[0].delay_hours) || 0));

            await db.execute(sql`
                INSERT INTO drip_enrollments (tenant_id, campaign_id, lead_id, next_run_at)
                 VALUES (${req.tenantId}, ${campaignId}, ${leadId}, ${nextRun.toISOString()})
            `);
        }

        res.json({ success: true, message: `Enrolled ${leadIds.length} leads` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to enroll leads in drip' });
    }
});

// --- WhatsApp Broadcasts ---
router.get('/broadcasts', async (req: any, res: Response) => {
    try {
        const { rows } = await db.execute(sql`
            SELECT * FROM whatsapp_campaigns WHERE tenant_id = ${req.tenantId} ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch broadcasts' });
    }
});

router.post('/broadcasts', async (req: any, res: Response) => {
    const { name: campaignName, message_body, lead_ids } = req.body;

    try {
        const { rows: campaign } = await db.execute(sql`
            INSERT INTO whatsapp_campaigns (tenant_id, name, message_body, recipients_count, status, sent_at) 
             VALUES (${req.tenantId}, ${campaignName}, ${message_body}, ${lead_ids.length}, 'Sending', NOW()) RETURNING *
        `);
        
        // Background Dispatch (Non-blocking)
        (async () => {
            let successCount = 0;
            const { rows: leads } = await db.execute(sql`
                SELECT id, name, phone FROM leads WHERE id = ANY(${lead_ids})
            `) as { rows: any[] };

            for (const lead of leads) {
                if (!lead.phone) continue;
                const personalizedMsg = message_body.replace(/\{\{name\}\}/gi, String(lead.name).split(' ')[0]);
                const sent = await sendWhatsappMessage(req.tenantId, lead.phone, personalizedMsg);
                if (sent) successCount++;
                
                await db.execute(sql`
                    INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
                     VALUES (${req.tenantId}, ${lead.id}, ${req.user.id}, 'Message', NOW(), ${`Bulk Campaign: ${campaignName}\nMessage: ${personalizedMsg}`}, 'Delivered')
                `);
            }

            await db.execute(sql`
                UPDATE whatsapp_campaigns SET status = 'Completed', updated_at = NOW() WHERE id = ${campaign[0].id}
            `);
            console.log(`[Bulk WA] Campaign '${campaignName}' finished. (${successCount}/${lead_ids.length} success)`);
        })();

        res.status(201).json(campaign[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initiate broadcast' });
    }
});

// --- Chatbot Settings ---
router.get('/chatbot', async (req: any, res: Response) => {
    try {
        const { rows } = await db.execute(sql`
            SELECT * FROM chatbot_settings WHERE tenant_id = ${req.tenantId}
        `);
        if (rows.length === 0) {
            const { rows: defaultBot } = await db.execute(sql`
                INSERT INTO chatbot_settings (tenant_id) VALUES (${req.tenantId}) RETURNING *
            `);
            return res.json(defaultBot[0]);
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch chatbot settings' });
    }
});

router.patch('/chatbot', async (req: any, res: Response) => {
    const fields = Object.entries(req.body);
    const setClauseFragments = fields.map((f) => sql`${sql.raw(`"${f[0]}"`)} = ${f[1]}`);

    try {
        const { rows } = await db.execute(sql`
            UPDATE chatbot_settings SET ${sql.join(setClauseFragments, sql`, `)}, updated_at = NOW() 
             WHERE tenant_id = ${req.tenantId} RETURNING *
        `);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update chatbot' });
    }
});

// POST /api/marketing/generate-template - AI Campaign Generator
router.post('/generate-template', async (req: any, res: Response) => {
    const { goal, segment } = req.body;

    try {
        const prompt = `
            SYSTEM: You are a high-performance Real Estate Marketing Director at Zentrix CRM.
            Your goal is to generate 3 distinct WhatsApp message variations that are high-converting, professional, and personalized for the Indian market.
            
            GOAL: ${goal}
            TARGET SEGMENT: ${segment}
            
            GUIDELINES:
            1. Use emojis strategically (not excessively).
            2. Keep it concise (WhatsApp format).
            3. Use {{name}} as the placeholder for the first name.
            4. Include a clear "Call to Action" (CTA).
            
            Return ONLY a JSON array of objects:
            [
              { "title": "Variation Name", "body": "The message text" },
              { "title": "Variation Name", "body": "The message text" },
              { "title": "Variation Name", "body": "The message text" }
            ]
        `;

        const variations = await generateAIResponse(prompt, true);
        res.json(variations);
    } catch (err) {
        console.error('[AI-Marketing] Template generation failed:', err);
        res.status(500).json({ error: 'AI failed to generate templates' });
    }
});

export default router;
