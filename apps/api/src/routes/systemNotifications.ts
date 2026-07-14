import express, { Request, Response } from 'express';
import pool from '../db/pool';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// ─── GET /api/system-notifications — fetch user's notifications ─────
router.get('/', async (req: any, res: Response) => {
    try {
        const { limit = 20, unreadOnly = false } = req.query;
        let q = 'SELECT * FROM system_notifications WHERE user_id = $1 AND tenant_id = $2';
        const params: any[] = [req.user.id, req.tenantId];

        if (unreadOnly) {
            q += ' AND is_read = false';
        }

        q += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit as string));

        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /system-notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// ─── PATCH /api/system-notifications/:id/read — mark as read ───────
router.patch('/:id/read', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            'UPDATE system_notifications SET is_read = true WHERE id = $1 AND user_id = $2 AND tenant_id = $3 RETURNING *',
            [req.params.id, req.user.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /system-notifications/:id/read error:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// ─── PATCH /api/system-notifications/read-all — mark all as read ────
router.patch('/read-all', async (req: any, res: Response) => {
    try {
        await pool.query(
            'UPDATE system_notifications SET is_read = true WHERE user_id = $1 AND tenant_id = $2',
            [req.user.id, req.tenantId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('PATCH /system-notifications/read-all error:', err);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// ─── DELETE /api/system-notifications/:id — delete notification ─────
router.delete('/:id', async (req: any, res: Response) => {
    try {
        const { rowCount } = await pool.query(
            'DELETE FROM system_notifications WHERE id = $1 AND user_id = $2 AND tenant_id = $3',
            [req.params.id, req.user.id, req.tenantId]
        );
        if (rowCount === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /system-notifications/:id error:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

export default router;
