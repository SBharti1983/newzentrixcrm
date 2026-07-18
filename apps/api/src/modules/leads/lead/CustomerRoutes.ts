import express, { Request, Response } from 'express';
import { db, customers } from '../../../db';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../../../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/customers
router.get('/', async (req: any, res: Response) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        // Using db.execute for complex analytical querying (The 5% Rule)
        const { rows } = await db.execute(sql`
            SELECT c.*, COUNT(b.id) as booking_count,
                 (
                     SELECT json_agg(json_build_object(
                         'id', i.id,
                         'type', i.type,
                         'date', to_char(i.date, 'DD Mon YYYY HH:MI AM'),
                         'duration', i.duration,
                         'note', i.note,
                         'agent', u.name
                     ) ORDER BY i.date DESC)
                     FROM interactions i
                     LEFT JOIN users u ON i.user_id = u.id
                     WHERE i.lead_id = c.lead_id
                 ) as interactions
             FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id
             WHERE c.tenant_id=${req.tenantId} GROUP BY c.id
             ORDER BY c.created_at DESC LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET /customers error:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// GET /api/customers/:id
router.get('/:id', async (req: any, res: Response) => {
    try {
        // Using db.execute for complex analytical querying (The 5% Rule)
        const { rows } = await db.execute(sql`
            SELECT c.*,
                json_agg(DISTINCT b.*) FILTER(WHERE b.id IS NOT NULL) as bookings,
                (
                    SELECT json_agg(json_build_object(
                        'id', i.id,
                        'type', i.type,
                        'date', to_char(i.date, 'DD Mon YYYY HH:MI AM'),
                        'duration', i.duration,
                        'note', i.note,
                        'agent', u.name
                    ) ORDER BY i.date DESC)
                        FROM interactions i
                        LEFT JOIN users u ON i.user_id = u.id
                        WHERE i.lead_id = c.lead_id
            ) as interactions
             FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id
             WHERE c.id = ${req.params.id} AND c.tenant_id = ${req.tenantId} GROUP BY c.id
        `);
        if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /customers/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// POST /api/customers
router.post('/', async (req: any, res: Response) => {
    try {
        const { lead_id, name, email, phone, alt_phone, city, address, pan_number, aadhar_number, dob, segment, status, join_date, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Customer name is required' });

        // Check for existing customer with same lead_id
        if (lead_id) {
            const existing = await db.select().from(customers)
                .where(and(eq(customers.leadId, lead_id), eq(customers.tenantId, req.tenantId)))
                .limit(1);
            if (existing[0]) {
                return res.json(existing[0]);
            }
        }

        const newCustomer = await db.insert(customers).values({
            tenantId: req.tenantId,
            leadId: lead_id || null,
            name,
            email: email || null,
            phone: phone || null,
            city: city || null,
            address: address || null,
            panNumber: pan_number || null,
            aadharNumber: aadhar_number || null,
            segment: segment || 'Standard',
            status: status || 'Active'
        }).returning();

        res.status(201).json(newCustomer[0]);
    } catch (err) {
        console.error('POST /customers error:', err);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// PATCH /api/customers/:id
router.patch('/:id', async (req: any, res: Response) => {
    try {
        const allowed = ['name', 'email', 'phone', 'alt_phone', 'city', 'address', 'pan_number', 'aadhar_number', 'dob', 'segment', 'status', 'join_date', 'notes'];
        
        const updates: any = {};
        for (const [k, v] of Object.entries(req.body)) {
            if (allowed.includes(k)) {
                // convert snake to camel
                const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                updates[camelKey] = v;
            }
        }

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        updates.updatedAt = new Date().toISOString();

        const updated = await db.update(customers)
            .set(updates)
            .where(and(eq(customers.id, req.params.id), eq(customers.tenantId, req.tenantId)))
            .returning();

        if (!updated[0]) return res.status(404).json({ error: 'Customer not found' });
        res.json(updated[0]);
    } catch (err) {
        console.error('PATCH /customers error:', err);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

export default router;
