const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/search?q=...
router.get('/', async (req, res) => {
    let { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ leads: [], projects: [] });

    q = q.trim();

    try {
        const [leads, projects] = await Promise.all([
            // Search Leads
            pool.query(
                `SELECT id, name, phone, email, stage, 'lead' as type 
                 FROM leads 
                 WHERE tenant_id = $1 AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2) 
                 LIMIT 5`,
                [req.tenantId, `%${q}%`]
            ),
            // Search Projects
            pool.query(
                `SELECT id, name, location, rera_number, 'project' as type 
                 FROM projects 
                 WHERE tenant_id = $1 AND (name ILIKE $2 OR location ILIKE $2) 
                 LIMIT 5`,
                [req.tenantId, `%${q}%`]
            )
        ]);

        res.json({
            leads: leads.rows,
            projects: projects.rows
        });
    } catch (err) {
        console.error('Unified search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
