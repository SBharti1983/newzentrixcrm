const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/projects
router.get('/', async (req, res) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;
        let q = `SELECT * FROM projects WHERE tenant_id = $1`;
        const params = [req.tenantId];
        if (status) { q += ` AND status = $${params.length + 1}`; params.push(status); }
        q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /projects error:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT p.*, COUNT(i.id) as total_units_db, COUNT(i.id) FILTER (WHERE i.status='Available') as available_units_db
             FROM projects p LEFT JOIN inventory i ON i.project_id = p.id
             WHERE p.id = $1 AND p.tenant_id = $2 GROUP BY p.id`,
            [req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /projects/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// Note: Project CRUD (Create, Update, Delete) has been temporarily disabled/reverted per user request.
// Only viewing is currently enabled via GET routes.


// GET /api/projects/:id/inventory
router.get('/:id/inventory', async (req, res) => {
    try {
        const { status, type, limit = 200, offset = 0 } = req.query;
        let q = `SELECT * FROM inventory WHERE project_id=$1 AND tenant_id=$2`;
        const params = [req.params.id, req.tenantId];
        if (status) { q += ` AND status=$${params.length + 1}`; params.push(status); }
        if (type) { q += ` AND property_type=$${params.length + 1}`; params.push(type); }
        q += ` ORDER BY floor, unit_no LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('GET /inventory error:', err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /api/projects/:id/inventory — add unit
router.post('/:id/inventory', async (req, res) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });
        const { unit_no, floor, area_sqft, property_type, facing, base_price, status } = req.body;
        if (!unit_no) return res.status(400).json({ error: 'Unit number is required' });
        const { rows } = await pool.query(
            `INSERT INTO inventory (tenant_id, project_id, unit_no, floor, area_sqft, property_type, facing, base_price, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [req.tenantId, req.params.id, unit_no, floor || null, area_sqft || null,
            property_type || null, facing || null, base_price || null, status || 'Available']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Unit number already exists in this project' });
        console.error('POST /inventory error:', err);
        res.status(500).json({ error: 'Failed to add unit' });
    }
});

// PATCH /api/projects/:id/inventory/:unitId — update unit
router.patch('/:id/inventory/:unitId', async (req, res) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const allowed = ['unit_no', 'floor', 'area_sqft', 'property_type', 'facing', 'base_price', 'status', 'parking'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`).join(', ');
        const values = Object.values(updates);

        const { rows } = await pool.query(
            `UPDATE inventory 
             SET ${setClauses}, updated_at = NOW() 
             WHERE id = $1 AND project_id = $2 AND tenant_id = $3 
             RETURNING *`,
            [req.params.unitId, req.params.id, req.tenantId, ...values]
        );

        if (!rows[0]) return res.status(404).json({ error: 'Unit not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /inventory error:', err);
        res.status(500).json({ error: 'Failed to update unit' });
    }
});

module.exports = router;
