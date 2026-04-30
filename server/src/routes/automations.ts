import express, { Request, Response } from 'express';
import pool from '../db/pool';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/automations — list all workflows
router.get('/', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM workflows WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

// POST /api/automations — create workflow
router.post('/', async (req: any, res: Response) => {
    const { name, trigger_type, trigger_config, action_type, action_config } = req.body;
    try {
        const { rows } = await pool.query(
            `INSERT INTO workflows (tenant_id, name, trigger_type, trigger_config, action_type, action_config)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.tenantId, name, trigger_type, trigger_config || {}, action_type, action_config || {}]
        );
        res.json(rows[0]);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});

// PATCH /api/automations/:id — toggle status or edit
router.patch('/:id', async (req: any, res: Response) => {
    const { is_active, name } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE workflows SET is_active = COALESCE($1, is_active), name = COALESCE($2, name)
             WHERE id = $3 AND tenant_id = $4 RETURNING *`,
            [is_active, name, req.params.id, req.tenantId]
        );
        res.json(rows[0]);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

// GET /api/automations/logs — get recent logs
router.get('/logs', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT al.*, w.name as workflow_name, l.name as lead_name
             FROM automation_logs al
             JOIN workflows w ON al.workflow_id = w.id
             LEFT JOIN leads l ON al.lead_id = l.id
             WHERE al.tenant_id = $1
             ORDER BY al.created_at DESC LIMIT 50`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// DELETE /api/automations/:id
router.delete('/:id', async (req: any, res: Response) => {
    try {
        await pool.query(`DELETE FROM workflows WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
        res.json({ message: 'Deleted successfully' });
    } catch (_err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;
