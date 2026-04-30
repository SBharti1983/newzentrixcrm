import express, { Request, Response } from 'express';
import pool from '../db/pool';
import { authenticateToken } from '../middleware/auth';
import upload from '../middleware/upload';

const router = express.Router();
router.use(authenticateToken);

// GET /api/documents — list all documents for tenant
router.get('/', async (req: any, res: Response) => {
    try {
        const { booking_id, customer_id, type, status } = req.query;
        let q = `
            SELECT d.*,
                   b.unit_no, b.token_amount,
                   c.name as customer_name,
                   u.name as uploaded_by_name,
                   p.name as project_name
            FROM documents d
            LEFT JOIN bookings  b ON d.booking_id  = b.id
            LEFT JOIN customers c ON d.customer_id  = c.id
            LEFT JOIN users     u ON d.uploaded_by  = u.id
            LEFT JOIN projects  p ON b.project_id   = p.id
            WHERE d.tenant_id = $1
        `;
        const params: any[] = [req.tenantId];
        if (booking_id) { q += ` AND d.booking_id  = $${params.length + 1}`; params.push(booking_id); }
        if (customer_id) { q += ` AND d.customer_id = $${params.length + 1}`; params.push(customer_id); }
        if (type) { q += ` AND d.type        = $${params.length + 1}`; params.push(type); }
        if (status) { q += ` AND d.status      = $${params.length + 1}`; params.push(status); }
        q += ` ORDER BY d.created_at DESC`;
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /documents error:', err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// GET /api/documents/:id
router.get('/:id', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.*, c.name as customer_name, u.name as uploaded_by_name, p.name as project_name, b.unit_no
             FROM documents d
             LEFT JOIN bookings  b ON d.booking_id  = b.id
             LEFT JOIN customers c ON d.customer_id  = c.id
             LEFT JOIN users     u ON d.uploaded_by  = u.id
             LEFT JOIN projects  p ON b.project_id   = p.id
             WHERE d.id = $1 AND d.tenant_id = $2`,
            [req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
        res.json(rows[0]);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

// POST /api/documents — upload / create a document record
router.post('/', async (req: any, res: Response) => {
    try {
        const {
            booking_id, customer_id, name, type, file_url, file_size,
            mime_type, status, expires_at, notes
        } = req.body;

        if (!name) return res.status(400).json({ error: 'Document name is required' });

        const { rows } = await pool.query(
            `INSERT INTO documents
                (tenant_id, booking_id, customer_id, uploaded_by, name, type, file_url, file_size, mime_type, status, expires_at, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING *`,
            [
                req.tenantId, booking_id || null, customer_id || null, req.user.id,
                name, type || 'Other', file_url || null, file_size || null,
                mime_type || null, status || 'Draft', expires_at || null, notes || null,
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /documents error:', err);
        res.status(500).json({ error: 'Failed to create document record' });
    }
});

// PATCH /api/documents/:id — update status, notes, sign
router.patch('/:id', async (req: any, res: Response) => {
    try {
        const allowed = ['name', 'type', 'status', 'file_url', 'file_size', 'mime_type', 'expires_at', 'notes', 'signed_at'];
        const updates: Record<string, any> = Object.fromEntries(
            Object.entries(req.body).filter(([k]) => allowed.includes(k))
        );

        // Auto-set signed_at when marking as Signed
        if (updates.status === 'Signed' && !updates.signed_at) {
            updates.signed_at = new Date().toISOString();
        }

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });

        const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3}`).join(',');
        const { rows } = await pool.query(
            `UPDATE documents SET ${set}, updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...Object.values(updates)]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /documents error:', err);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req: any, res: Response) => {
    try {
        const { rowCount } = await pool.query(
            `DELETE FROM documents WHERE id=$1 AND tenant_id=$2`,
            [req.params.id, req.tenantId]
        );
        if (!rowCount) return res.status(404).json({ error: 'Document not found' });
        res.json({ message: 'Document deleted' });
    } catch (_err) {
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// POST /api/documents/upload — upload actual file + create record
router.post('/upload', (upload as any).single('file'), async (req: any, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { booking_id, customer_id, name, type, status, expires_at, notes } = req.body;
        const fileUrl = `/uploads/${req.tenantId}/${req.file.filename}`;

        const { rows } = await pool.query(
            `INSERT INTO documents
                (tenant_id, booking_id, customer_id, uploaded_by, name, type, file_url, file_size, mime_type, status, expires_at, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [
                req.tenantId, booking_id || null, customer_id || null, req.user.id,
                name || req.file.originalname, type || 'Other', fileUrl,
                req.file.size, req.file.mimetype, status || 'Draft',
                expires_at || null, notes || null,
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /documents/upload error:', err);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

export default router;
