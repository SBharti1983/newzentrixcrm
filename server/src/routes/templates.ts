import express, { Request, Response } from 'express';
import pool from '../db/pool';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/templates — fetch all templates for the tenant
router.get('/', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM message_templates WHERE tenant_id = $1 ORDER BY category, name',
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch templates error:', err);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

export default router;
