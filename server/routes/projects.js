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

// POST /api/projects - create a new project
router.post('/', async (req, res) => {
    try {
        if (!['superadmin', 'admin'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const { name, location, type, status, total_units, available_units, price_range, rera_number, possession_date, amenities } = req.body;
        if (!name) return res.status(400).json({ error: 'Project name is required' });

        const { rows } = await pool.query(
            `INSERT INTO projects (tenant_id, name, location, type, status, total_units, available_units, price_range, rera_number, possession_date, amenities)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [req.tenantId, name, location, type || 'Residential', status || 'Active', total_units || 0, available_units || 0, price_range, rera_number, possession_date, amenities || []]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /projects error:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PATCH /api/projects/:id - update a project
router.patch('/:id', async (req, res) => {
    try {
        if (!['superadmin', 'admin'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const allowed = ['name', 'location', 'type', 'status', 'total_units', 'available_units', 'price_range', 'rera_number', 'possession_date', 'amenities'];
        const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`).join(', ');
        const values = Object.values(updates);

        const { rows } = await pool.query(
            `UPDATE projects SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
            [req.params.id, req.tenantId, ...values]
        );

        if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /projects/:id error:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});


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

// DELETE /api/projects/:id - delete a project
router.delete('/:id', async (req, res) => {
    try {
        if (!['superadmin', 'admin'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        // First, check if there's inventory associated with this project
        const { rows: inventory } = await pool.query(
            `SELECT COUNT(*) FROM inventory WHERE project_id = $1 AND tenant_id = $2`,
            [req.params.id, req.tenantId]
        );

        if (parseInt(inventory[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete project with active inventory. Delete units first.' });
        }

        const { rowCount } = await pool.query(
            `DELETE FROM projects WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, req.tenantId]
        );

        if (rowCount === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error('DELETE /projects/:id error:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

module.exports = router;
