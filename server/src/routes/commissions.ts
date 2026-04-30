import express, { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/commissions — List commission records
router.get('/', async (req: any, res: Response) => {
    try {
        const { status } = req.query;
        const queryFragments = [sql`c.tenant_id = ${req.tenantId}`];

        if (status) {
            queryFragments.push(sql`c.status = ${status}`);
        }

        const { rows } = await db.execute(sql`
            SELECT 
                c.*, 
                l.name as lead_name,
                p.name as project_name,
                substring(c.booking_id::text, 1, 8) as booking_ref,
                CASE 
                    WHEN c.entity_type = 'Internal' THEN u.name 
                    ELSE cp.name 
                END as payee_name,
                CASE 
                    WHEN c.entity_type = 'Internal' THEN 'Agent' 
                    ELSE cp.company 
                END as payee_detail
            FROM commissions c
            LEFT JOIN leads l ON c.lead_id = l.id
            LEFT JOIN bookings b ON c.booking_id = b.id
            LEFT JOIN projects p ON l.project_id = p.id
            LEFT JOIN users u ON c.entity_id = u.id AND c.entity_type = 'Internal'
            LEFT JOIN channel_partners cp ON c.entity_id = cp.id AND c.entity_type = 'Channel Partner'
            WHERE ${sql.join(queryFragments, sql` AND `)}
            ORDER BY c.created_at DESC
        `);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
});

// PATCH /api/commissions/:id — Mark as Paid
router.patch('/:id', async (req: any, res: Response) => {
    const { status } = req.body;
    try {
        const targetStatus = status || 'Paid';
        const { rows } = await db.execute(sql`
            UPDATE commissions 
             SET status = ${targetStatus}, paid_at = CASE WHEN ${targetStatus} = 'Paid' THEN NOW() ELSE NULL END 
             WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId} 
             RETURNING *
        `);

        if (!rows[0]) return res.status(404).json({ error: 'Record not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update commission' });
    }
});

// POST /api/commissions/generate — Generate commission when a booking happens
router.post('/generate', async (req: any, res: Response) => {
    const { booking_id } = req.body;
    try {
        const { rows: bookingRows } = await db.execute(sql`
            SELECT b.*
             FROM bookings b 
             WHERE b.id = ${booking_id} AND b.tenant_id = ${req.tenantId}
        `);

        if (!bookingRows[0]) return res.status(404).json({ error: 'Booking not found' });

        // 💰 The 5% Rule: Use the highly optimized PostgreSQL Stored Procedure 
        // We offload the 1.5% and 2.0% calculation logic entirely to the database!
        await db.execute(sql`CALL calculate_commission(${booking_id}, ${req.tenantId})`);

        res.status(201).json({ message: 'Commissions generated successfully via Database Stored Procedure', count: 1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate commissions' });
    }
});

export default router;
