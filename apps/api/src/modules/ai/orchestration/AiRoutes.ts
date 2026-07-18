import express, { Request, Response } from 'express';
import pool from '../../../db/pool';
import { authenticateToken } from '../../../middleware/auth';
import { generateAIResponse } from '../../../utils/ai';
import aiService from '../../ai/orchestration/AiService';
import NurtureAutoPilot from '../../leads/nurture/NurtureAutoPilot';

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/ai/daily-briefing
 * Analyzes agent's leads and generates a strategic "Top 5" call list
 */
router.get('/daily-briefing', async (req: any, res: Response) => {
    try {
        const tid = req.tenantId;
        const uid = req.user.id;

        // 1. Fetch relevant leads (Assigned to agent, active stages)
        const { rows: leads } = await pool.query(`
            SELECT l.id, l.name, l.stage, l.score, l.last_contact_at, p.name as project_name
            FROM leads l
            LEFT JOIN projects p ON l.project_id = p.id
            WHERE l.tenant_id = $1 AND l.assigned_to = $2
              AND l.stage NOT IN ('Won', 'Lost')
            ORDER BY l.score DESC, l.last_contact_at ASC
            LIMIT 20
        `, [tid, uid]);

        if (leads.length === 0) {
            return res.json({ briefing: [], message: "No active leads assigned to you yet." });
        }

        // 2. Run AI Analysis
        const briefing = await aiService.generateDailyBriefing(leads);

        // 3. Map lead details back to briefing
        const enrichedBriefing = (Array.isArray(briefing) ? briefing : []).map(b => {
            const lead = leads.find(l => l.id === b.id);
            return {
                ...b,
                leadName: lead?.name || 'Unknown Lead',
                score: lead?.score || 0
            };
        });

        res.json(enrichedBriefing);
    } catch (err) {
        console.error('[Daily Briefing Error]', err);
        res.status(500).json({ error: 'Failed to generate briefing' });
    }
});

/**
 * POST /api/ai/generate-agreement
 * Generates a professional booking agreement document content
 */
router.post('/generate-agreement', async (req: any, res: Response) => {
    const { lead_id, project_id, unit_details } = req.body;

    try {
        // 1. Get Context
        const { rows: leadRows } = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [lead_id, req.tenantId]);
        const { rows: projectRows } = await pool.query('SELECT * FROM projects WHERE id = $1 AND tenant_id = $2', [project_id, req.tenantId]);

        if (!leadRows[0] || !projectRows[0]) {
            return res.status(404).json({ error: 'Lead or Project not found' });
        }

        // 2. Generate Agreement
        const content = await aiService.generateAgreement(leadRows[0], projectRows[0], unit_details);

        res.json({ content });
    } catch (err) {
        console.error('[Agreement API Error]', err);
        res.status(500).json({ error: 'Failed to generate document' });
    }
});

/**
 * POST /api/ai/generate-pitch
 * Generates a personalized project pitch based on lead history and preferences
 */
router.post('/generate-pitch', async (req: any, res: Response) => {
    const { lead_id, project_id } = req.body;

    try {
        let lead = null;
        let interactionsString = 'Customer has shown initial interest but specific preferences not yet deep-dived.';
        let project = null;

        if (lead_id) {
            // 🔥 STORED PROCEDURE: AI Context (Lead, Interactions, Project) in 1 trip
            const spRes = await pool.query('SELECT get_copilot_context($1::uuid, $2::uuid) as data', [lead_id, req.tenantId]);
            const data = spRes.rows[0]?.data;
            if (data) {
                lead = data.lead;
                if (data.interactions && data.interactions.length > 0) {
                    interactionsString = data.interactions.map((i: any) => `[${i.type}] ${i.note}`).join('\n');
                }
                project = data.project;
            }
        } else if (project_id) {
            // Fallback for general project pitch without a specific lead
            const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1 AND tenant_id = $2', [project_id, req.tenantId]);
            project = rows[0];
        }

        if (lead_id && !lead) return res.status(404).json({ error: 'Lead not found' });

        // 2. Construct Gemini Prompt
        const prompt = `
            You are a top-tier real estate sales consultant for Zentrix Realty.
            Your task is to generate a hyper-personalized "Project Pitch" for a potential buyer.

            LEAD PROFILE:
            Name: ${lead ? lead.name : 'Valued Customer'}
            Current Stage: ${lead ? lead.stage : 'Discovery'}
            Interested Property Type: ${lead ? lead.property_type : (project ? project.property_type : 'Residential')}
            Budget: ${lead ? lead.budget : 'Premium'}

            PROJECT DETAILS:
            ${project ? `Project: ${project.name}\nLocation: ${project.location}\nAmenities: ${project.amenities || 'Luxury amenities'}\nHighlights: ${project.description}` : 'General Zentrix Premium Portfolio'}

            CUSTOMER INTERACTION HISTORY (TRANSCRIPTS/NOTES):
            ${interactionsString || 'Customer has shown initial interest but specific preferences not yet deep-dived.'}

            INSTRUCTIONS:
            1. Analyze what the customer cares about most (e.g., location, family amenities, investment value, lifestyle).
            2. Craft a "Hook" that addresses their specific pain point or desire.
            3. Highlight 3 key features of the project/portfolio that match THEIR interests.
            4. Include a soft call-to-action (CTA).
            5. Keep the tone professional, aspirational, and high-energy.

            OUTPUT FORMAT:
            Return a JSON object with:
            {
              "headline": "Personalized catchy headline",
              "hook": "Single sentence high-impact opening",
              "value_propositions": ["Point 1", "Point 2", "Point 3"],
              "cta": "Specific next step for this lead"
            }
        `;

        const pitch = await generateAIResponse(prompt, true);
        res.json(pitch);

    } catch (err) {
        console.error('[AI Pitch Generator Error]:', err);
        res.status(500).json({ error: 'AI failed to generate pitch. Please try again.' });
    }
});

/**
 * POST /api/ai/suggest-message
 * Drafts a personalized WhatsApp/Email message for a specific lead
 */
router.post('/suggest-message', async (req: any, res: Response) => {
    const { lead_id, reason } = req.body;

    try {
        // 🔥 STORED PROCEDURE: AI Context
        const spRes = await pool.query('SELECT get_copilot_context($1::uuid, $2::uuid) as data', [lead_id, req.tenantId]);
        const data = spRes.rows[0]?.data;

        if (!data || !data.lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const message = await aiService.generateSuggestedMessage(
            data.lead,
            data.interactions || [],
            data.project,
            reason || 'Proactive re-engagement'
        );

        res.json({ message });
    } catch (err) {
        console.error('[AI Suggested Message Error]:', err);
        res.status(500).json({ error: 'Failed to generate message' });
    }
});

/**
 * POST /api/ai/auto-pilot/trigger
 * Manually triggers the Nurture Auto-Pilot cycle
 */
router.post('/auto-pilot/trigger', async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized: Admin only' });
        }

        const stats = await NurtureAutoPilot.runCycle();
        res.json({ success: true, ...stats });
    } catch (err) {
        console.error('[Auto-Pilot Trigger Error]:', err);
        res.status(500).json({ error: 'Failed to run auto-pilot' });
    }
});

export default router;
