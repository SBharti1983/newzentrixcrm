import express, { Request, Response } from 'express';
import pool from '../db/pool';

const router = express.Router();

/**
 * PUBLIC ROUTE: Get Partner Branding
 */
router.get('/partner/:id', async (req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT name, company, city, type, avatar 
             FROM channel_partners 
             WHERE id = $1 AND status = 'Active'`,
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Partner not found or inactive' });
        res.json(rows[0]);
    } catch (err) {
        console.error('GET partner public info error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUBLIC ROUTE: Get Active Projects
 */
router.get('/projects', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, location, price_range 
             FROM projects 
             WHERE status = 'Active' 
             ORDER BY name ASC`
        );
        res.json(rows);
    } catch (err) {
        console.error('GET public projects error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUBLIC ROUTE: Submit Referral
 */
router.post('/submit', async (req: Request, res: Response) => {
    const {
        name, phone, email, city, project_id, property_type, budget,
        notes, partner_id
    } = req.body;

    if (!name || !phone || !partner_id) {
        return res.status(400).json({ error: 'Name, phone, and partner ID are required' });
    }

    try {
        // 1. Verify partner and get tenant_id
        const { rows: pRows } = await pool.query(
            `SELECT tenant_id, name as partner_name FROM channel_partners WHERE id = $1 AND status = 'Active'`,
            [partner_id]
        );
        if (!pRows[0]) return res.status(404).json({ error: 'Invalid referral link' });
        const { tenant_id, partner_name } = pRows[0];

        // 2. Check for duplicates by phone in this tenant
        const { rows: dRows } = await pool.query(
            `SELECT id FROM leads WHERE tenant_id = $1 AND phone = $2`,
            [tenant_id, phone]
        );
        if (dRows.length > 0) {
            return res.status(409).json({ error: 'This lead is already in our system.' });
        }

        // 3. Create Lead
        const { rows: lRows } = await pool.query(
            `INSERT INTO leads (
                tenant_id, name, phone, email, city, source, 
                stage, property_type, project_id, budget, 
                notes, channel_partner_id, last_contact_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            RETURNING *`,
            [
                tenant_id, name, phone, email || null, city || null,
                'Partner Referral', 'New', property_type || null,
                project_id || null, budget || null,
                notes || `Referred by: ${partner_name}`, partner_id
            ]
        );

        const newLead = lRows[0];

        // 4. Update Partner Stats
        await pool.query(
            `UPDATE channel_partners 
             SET total_leads_referred = total_leads_referred + 1 
             WHERE id = $1`,
            [partner_id]
        );

        res.status(201).json({
            message: 'Referral submitted successfully!',
            id: newLead.id
        });

    } catch (err) {
        console.error('Submit referral error:', err);
        res.status(500).json({ error: 'Failed to submit referral' });
    }
});

export default router;
