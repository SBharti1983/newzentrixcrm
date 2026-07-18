import express, { Request, Response } from 'express';
import pool from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/search?q=...
router.get('/', async (req: any, res: Response) => {
    let { q } = req.query;
    if (!q || (q as string).trim().length < 2) return res.json({ leads: [], projects: [] });

    q = (q as string).trim();

    try {
        // 🔥 STORED PROCEDURE: Global Search (Leads + Projects) in 1 trip
        const spRes = await pool.query('SELECT global_search($1::uuid, $2::text) as data', [req.tenantId, q]);
        const data = spRes.rows[0]?.data || { leads: [], projects: [] };

        res.json({
            leads: data.leads || [],
            projects: data.projects || []
        });
    } catch (err) {
        console.error('Unified search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

export default router;
