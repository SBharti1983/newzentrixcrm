/**
 * /api/enquiries — Public route (no auth needed for POST)
 * Used by the /enquiry lead capture page
 */
import express, { Request, Response } from 'express';
import pool from '../../../db/pool';
import { authenticateToken } from '../../../middleware/auth';

const router = express.Router();

// POST /api/enquiries — PUBLIC (no auth)
router.post('/', async (req: Request, res: Response) => {
    const { name, phone, email, city, project_id, property_type, budget, source, message, tenant_slug } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    try {
        // Resolve tenant from slug (so the form can be embedded for any tenant)
        const slug = tenant_slug || 'zentrix';
        const { rows: tRows } = await pool.query(`SELECT id FROM tenants WHERE slug=$1 AND is_active=TRUE`, [slug]);
        if (!tRows[0]) return res.status(404).json({ error: 'Tenant not found' });
        const tenantId = tRows[0].id;

        const refNo = `ENQ-${Date.now().toString().slice(-7)}`;
        const { rows } = await pool.query(
            `INSERT INTO enquiries (tenant_id, name, phone, email, city, project_id, property_type, budget, source, message, ref_no)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [tenantId, name, phone, email || null, city || null,
                project_id || null, property_type || null, budget || null,
                source || 'Website Enquiry', message || null, refNo]
        );
        res.status(201).json({ message: 'Enquiry received!', ref_no: refNo, id: rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit enquiry' });
    }
});

// Protected routes below
router.use(authenticateToken);

// GET /api/enquiries — list for staff
router.get('/', async (req: any, res: Response) => {
    const { status } = req.query;
    let q = `SELECT e.*, p.name as project_name FROM enquiries e
             LEFT JOIN projects p ON e.project_id = p.id
             WHERE e.tenant_id=$1`;
    const params: any[] = [req.tenantId];
    if (status) { q += ` AND e.status=$2`; params.push(status); }
    q += ' ORDER BY e.created_at DESC LIMIT 100';
    const { rows } = await pool.query(q, params);
    res.json(rows);
});

// PATCH /api/enquiries/:id — update status or convert to lead
router.patch('/:id', async (req: any, res: Response) => {
    const { status, convert_to_lead } = req.body;

    if (convert_to_lead) {
        // Auto-create a lead from the enquiry
        const { rows: [enq] } = await pool.query(`SELECT * FROM enquiries WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
        if (!enq) return res.status(404).json({ error: 'Enquiry not found' });

        const { rows: [lead] } = await pool.query(
            `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, property_type, project_id, budget)
             VALUES ($1,$2,$3,$4,$5,$6,'New',$7,$8,$9) RETURNING *`,
            [req.tenantId, enq.name, enq.phone, enq.email, enq.city, enq.source, enq.property_type, enq.project_id, enq.budget]
        );
        await pool.query(
            `UPDATE enquiries SET status='Converted', converted_lead_id=$1 WHERE id=$2`,
            [lead.id, req.params.id]
        );
        return res.json({ message: 'Converted to lead', lead });
    }

    if (status) {
        await pool.query(`UPDATE enquiries SET status=$1 WHERE id=$2 AND tenant_id=$3`, [status, req.params.id, req.tenantId]);
    }
    res.json({ message: 'Updated' });
});

export default router;
