import express, { Request, Response } from 'express';
import { db, followups, leads, users } from '../db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/followups
router.get('/', async (req: any, res: Response) => {
    try {
        const { status, type, date_from, date_to, limit = 200, offset = 0 } = req.query;
        
        const conditions = [eq(followups.tenantId, req.tenantId)];
        
        if (status) conditions.push(eq(followups.status, status as string));
        if (type) conditions.push(eq(followups.type, type as string));
        if (date_from) conditions.push(gte(followups.scheduledAt, date_from as string));
        if (date_to) conditions.push(lte(followups.scheduledAt, date_to as string));
        if (req.user.role === 'agent') conditions.push(eq(followups.assignedTo, req.user.id));

        const results = await db.select({
            id: followups.id,
            tenantId: followups.tenantId,
            leadId: followups.leadId,
            assignedTo: followups.assignedTo,
            type: followups.type,
            priority: followups.priority,
            scheduledAt: followups.scheduledAt,
            status: followups.status,
            note: followups.note,
            outcome: followups.outcome,
            createdAt: followups.createdAt,
            lead_name: leads.name,
            lead_phone: leads.phone,
            lead_stage: leads.stage,
            agent_name: users.name,
            avatar: users.avatar
        })
        .from(followups)
        .leftJoin(leads, eq(followups.leadId, leads.id))
        .leftJoin(users, eq(followups.assignedTo, users.id))
        .where(and(...conditions))
        .orderBy(desc(followups.scheduledAt))
        .limit(Number(limit))
        .offset(Number(offset));

        res.json(results);
    } catch (err) {
        console.error('GET /followups error:', err);
        res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
});

// POST /api/followups
router.post('/', async (req: any, res: Response) => {
    try {
        const { lead_id, assigned_to, type, priority, scheduled_at, note } = req.body;
        if (!lead_id || !scheduled_at) return res.status(400).json({ error: 'lead_id and scheduled_at required' });
        
        const newFollowup = await db.insert(followups).values({
            tenantId: req.tenantId,
            leadId: lead_id,
            assignedTo: assigned_to || req.user.id,
            type: type || 'Call',
            priority: priority || 'Medium',
            scheduledAt: scheduled_at,
            note: note || null
        }).returning();

        // Update lead's last contact time
        await db.update(leads)
            .set({ lastContactAt: new Date().toISOString() })
            .where(eq(leads.id, lead_id));

        res.status(201).json(newFollowup[0]);
    } catch (err) {
        console.error('POST /followups error:', err);
        res.status(500).json({ error: 'Failed to create follow-up' });
    }
});

// PATCH /api/followups/:id
router.patch('/:id', async (req: any, res: Response) => {
    try {
        const allowed = ['type', 'priority', 'scheduledAt', 'status', 'note', 'outcome', 'assignedTo'];
        // Convert snake_case to camelCase for Drizzle if needed, but we'll accept either for now
        const updates: any = {};
        for (const [k, v] of Object.entries(req.body)) {
            if (k === 'scheduled_at') updates['scheduledAt'] = v;
            else if (k === 'assigned_to') updates['assignedTo'] = v;
            else if (allowed.includes(k)) updates[k] = v;
        }

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        
        updates.updatedAt = new Date().toISOString();

        const updated = await db.update(followups)
            .set(updates)
            .where(and(eq(followups.id, req.params.id), eq(followups.tenantId, req.tenantId)))
            .returning();

        if (!updated[0]) return res.status(404).json({ error: 'Follow-up not found' });
        res.json(updated[0]);
    } catch (err) {
        console.error('PATCH /followups error:', err);
        res.status(500).json({ error: 'Failed to update follow-up' });
    }
});

// DELETE /api/followups/:id
router.delete('/:id', async (req: any, res: Response) => {
    try {
        const deleted = await db.delete(followups)
            .where(and(eq(followups.id, req.params.id), eq(followups.tenantId, req.tenantId)))
            .returning();
            
        if (!deleted.length) return res.status(404).json({ error: 'Follow-up not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('DELETE /followups error:', err);
        res.status(500).json({ error: 'Failed to delete follow-up' });
    }
});

export default router;
