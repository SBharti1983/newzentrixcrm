import express, { Request, Response } from 'express';
import pool from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/channel-partners
router.get('/', async (req: any, res: Response) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;
        let q = `SELECT * FROM channel_partners WHERE tenant_id=$1`;
        const params: any[] = [req.tenantId];
        if (status) { q += ` AND status=$${params.length + 1}`; params.push(status); }
        q += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit as string), parseInt(offset as string));
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /channel-partners error:', err);
        res.status(500).json({ error: 'Failed to fetch channel partners' });
    }
});

// POST /api/channel-partners
router.post('/', async (req: any, res: Response) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });
        const { name, company, email, phone, city, rera_no, contact_person, status, commission_rate, notes, assigned_projects, type } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        const { rows } = await pool.query(
            `INSERT INTO channel_partners (tenant_id, name, company, email, phone, city, rera_no, contact_person, status, commission_rate, notes, assigned_projects, type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [req.tenantId, name, company || null, email || null, phone || null, city || null, rera_no || null, contact_person || null, status || 'Active', commission_rate || 2.0, notes || null, JSON.stringify(assigned_projects || []), type || 'Firm']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /channel-partners error:', err);
        res.status(500).json({ error: 'Failed to create channel partner' });
    }
});

// PATCH /api/channel-partners/:id
router.patch('/:id', async (req: any, res: Response) => {
    try {
        const allowed = ['name', 'company', 'email', 'phone', 'city', 'rera_no', 'contact_person', 'status', 'commission_rate', 'notes', 'assigned_projects', 'type'];
        const updates: Record<string, any> = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        if (updates.assigned_projects) updates.assigned_projects = JSON.stringify(updates.assigned_projects);
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3}`).join(',');
        const { rows } = await pool.query(
            `UPDATE channel_partners SET ${set} WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...Object.values(updates)]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Partner not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /channel-partners error:', err);
        res.status(500).json({ error: 'Failed to update channel partner' });
    }
});

export default router;
