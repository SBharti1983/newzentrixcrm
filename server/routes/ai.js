const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { generateAIResponse } = require('../utils/ai');

const router = express.Router();
router.use(auth);

/**
 * POST /api/ai/generate-pitch
 * Generates a personalized project pitch based on lead history and preferences
 */
router.post('/generate-pitch', async (req, res) => {
    const { lead_id, project_id } = req.body;

    try {
        // 1. Fetch Lead Details & Interactions
        const [leadRes, interactionsRes, projectRes] = await Promise.all([
            lead_id ? pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [lead_id, req.tenantId]) : Promise.resolve({ rows: [] }),
            lead_id ? pool.query('SELECT note, type, sentiment FROM interactions WHERE lead_id = $1 AND tenant_id = $2 ORDER BY date DESC LIMIT 10', [lead_id, req.tenantId]) : Promise.resolve({ rows: [] }),
            project_id ? pool.query('SELECT * FROM projects WHERE id = $1 AND tenant_id = $2', [project_id, req.tenantId]) : Promise.resolve({ rows: [] })
        ]);

        const lead = leadRes.rows[0];
        // If lead_id was provided but not found, error out. If not provided, it's fine.
        if (lead_id && !lead) return res.status(404).json({ error: 'Lead not found' });

        const interactions = interactionsRes.rows.map(i => `[${i.type}] ${i.note}`).join('\n');
        const project = projectRes.rows[0];

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
            ${interactions || 'Customer has shown initial interest but specific preferences not yet deep-dived.'}

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

module.exports = router;
