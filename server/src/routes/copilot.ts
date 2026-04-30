import express, { Request, Response } from 'express';
import pool from '../db/pool';
import { authenticateToken } from '../middleware/auth';
import { generateAIResponse } from '../utils/ai';

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/copilot/ask
 * AI Sales Assistant that answers agent queries using database context.
 */
router.post('/ask', async (req: any, res: Response) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    console.log(`[COPILOT LOG] Query from ${req.user.name} (Tenant: ${req.tenantId}): ${query}`);

    try {
        const [projectsRes, tenantRes] = await Promise.all([
            pool.query('SELECT name, location, rera_number, price_range, amenities, description FROM projects WHERE tenant_id = $1 AND status = $2', [req.tenantId, 'Active']),
            pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId])
        ]);
        
        const projectsContext = JSON.stringify(projectsRes.rows);
        const tenantKey = tenantRes.rows[0]?.settings?.gemini_api_key || null;

        console.log(`[COPILOT LOG] Using custom key: ${tenantKey ? 'YES' : 'NO'}`);

        const prompt = `You are the Zentrix AI Sales Co-Pilot. Answer the agent's query using the following real estate inventory context.
        Inventory: ${projectsContext}
        Query: "${query}"`;

        const answer = (await generateAIResponse(prompt, false, tenantKey)) as string;
        res.json({ answer: answer.trim() });
    } catch (err: any) {
        console.error('[COPILOT ERROR LOG]', err);
        const msg = err.message || 'Internal error';
        res.status(500).json({ error: `[BACKEND-V2-ALIVE]: ${msg}` });
    }
});

export default router;
