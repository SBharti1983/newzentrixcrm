const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { generateAIResponse, isAiEnabled } = require('../utils/ai');

const router = express.Router();
router.use(auth);

/**
 * POST /api/copilot/ask
 * AI Sales Assistant that answers agent queries using database context.
 */
router.post('/ask', async (req, res) => {
    if (!isAiEnabled) {
        return res.status(503).json({ error: 'AI Assistant is currently disabled. Check GEMINI_API_KEY.' });
    }

    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    try {
        // Fetch Context data for the AI
        // 1. Fetch available Real Estate Projects
        const projectsRes = await pool.query('SELECT name, location, rera_number, price_range, amenities, description FROM projects WHERE tenant_id = $1 AND status = $2', [req.tenantId, 'Active']);
        const projectsContext = JSON.stringify(projectsRes.rows);

        // System prompt engineering to act as a world-class real estate sales manager
        const prompt = `
You are the Zentrix AI Sales Co-Pilot, an elite real estate sales assistant embedded directly in the CRM.
Your objective is to help the sales agent (who is currently asking you a question) close deals, answer product questions instantly, and handle client objections.

Context - Available Real Estate Inventory for this tenant:
${projectsContext}

Guidelines:
- Keep your answers extremely concise and punchy. Agents are often reading this live while on a phone call.
- Use bullet points.
- If they ask about a project or objection, provide a hyper-focused, confidence-inducing answer.
- If they ask something unrelated to sales or the inventory, politely redirect them.

Agent's Query: "${query}"

Generate the Co-Pilot's response (using beautiful markdown formatting for easy reading):
`;

        const answer = await generateAIResponse(prompt, false);
        
        res.json({ answer: answer.trim() });
    } catch (err) {
        console.error('[AI Co-Pilot Error]', err);
        res.status(500).json({ error: 'Failed to generate AI response. Please try again later.' });
    }
});

module.exports = router;
