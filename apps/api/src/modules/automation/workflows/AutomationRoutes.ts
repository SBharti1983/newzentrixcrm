import express, { Request, Response } from 'express';
import pool from '../../../db/pool';
import { authenticateToken } from '../../../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/automation/rules
 * Returns all automation workflows for the current tenant.
 */
router.get('/rules', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, trigger_type, action_type, is_active, trigger_config, action_config 
             FROM workflows WHERE tenant_id = $1 ORDER BY id DESC`,
            [req.tenantId]
        );

        // Map to frontend expected format
        const rules = rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: `${r.trigger_type.replace('_', ' ')} -> ${r.action_type.replace('_', ' ')}`,
            status: r.is_active ? 'Active' : 'Inactive',
            type: r.action_type === 'assign_agent' ? 'distribution' : 'reminder',
            config: { ...r.trigger_config, ...r.action_config }
        }));

        res.json(rules);
    } catch (err) {
        console.error('[Automation Routes] GET /rules error:', err);
        res.status(500).json({ error: 'Failed to fetch automation rules' });
    }
});

/**
 * PUT /api/automation/rules/:id
 * Toggles the active status of a workflow.
 */
router.put('/rules/:id', async (req: any, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const isActive = status === 'Active';

    try {
        const { rowCount } = await pool.query(
            `UPDATE workflows SET is_active = $1 WHERE id = $2 AND tenant_id = $3`,
            [isActive, id, req.tenantId]
        );

        if (rowCount === 0) return res.status(404).json({ error: 'Workflow not found' });

        res.json({ message: 'Rule updated successfully' });
    } catch (err) {
        console.error('[Automation Routes] PUT /rules/:id error:', err);
        res.status(500).json({ error: 'Failed to update rule' });
    }
});

/**
 * GET /api/automation/logs
 * Fetches the recent execution history for all tenant automations.
 */
router.get('/logs', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT 
                al.id, 
                wf.name as event, 
                l.name as lead, 
                u.name as agent, 
                al.created_at as time,
                al.details->>'message' as message
             FROM automation_logs al
             JOIN workflows wf ON al.workflow_id = wf.id
             LEFT JOIN leads l ON al.lead_id = l.id
             LEFT JOIN users u ON l.assigned_to = u.id
             WHERE al.tenant_id = $1
             ORDER BY al.created_at DESC 
             LIMIT 50`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error('[Automation Routes] GET /logs error:', err);
        res.status(500).json({ error: 'Failed to fetch automation logs' });
    }
});

export default router;
