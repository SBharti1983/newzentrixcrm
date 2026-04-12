const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Protect ALL superadmin routes — require auth + superadmin role
router.use(auth);
router.use((req, res, next) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
});

// Get all tenants
router.get('/tenants', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT t.*, 
                   (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
                   (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) as lead_count
            FROM tenants t
            ORDER BY t.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// Create a new tenant (and their admin user)
router.post('/tenants', async (req, res) => {
    const { name, admin_name, admin_email, admin_password, plan = 'trial', max_users = 3, max_leads = 500, settings = {} } = req.body;
    
    if (!name || !admin_name || !admin_email || !admin_password) {
        return res.status(400).json({ error: 'Company name, admin name, admin email, and admin password are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check email
        const { rows: existing } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [admin_email]);
        if (existing.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        let slug;
        if (plan === 'pro_solo') {
            slug = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');
        } else {
            slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
        }
        
        const { rows: slugCheck } = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        const uniqueSlug = slugCheck.length ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

        const { rows: [tenant] } = await client.query(
            `INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, settings)
             VALUES ($1, $2, $3, $4, $5, 5, $6) RETURNING *`,
            [name, uniqueSlug, plan, max_users, max_leads, settings]
        );

        const hash = await require('bcryptjs').hash(admin_password, 12);
        const avatar = admin_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        await client.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, avatar)
             VALUES ($1, $2, $3, $4, 'admin', $5)`,
            [tenant.id, admin_name, admin_email, hash, avatar]
        );

        await client.query('COMMIT');
        res.status(201).json({ ...tenant, user_count: 1, lead_count: 0 });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create tenant' });
    } finally {
        client.release();
    }
});

// Update full tenant details
router.patch('/tenants/:id', async (req, res) => {
    const { is_active, plan, name, slug, logo_url, primary_color, max_users, max_leads, settings } = req.body;
    try {
        const updates = [];
        const values = [];
        let index = 1;

        if (is_active !== undefined) { updates.push(`is_active = $${index++}`); values.push(is_active); }
        if (plan !== undefined) { updates.push(`plan = $${index++}`); values.push(plan); }
        if (name !== undefined) { updates.push(`name = $${index++}`); values.push(name); }
        if (slug !== undefined) { updates.push(`slug = $${index++}`); values.push(slug); }
        if (logo_url !== undefined) { updates.push(`logo_url = $${index++}`); values.push(logo_url); }
        if (primary_color !== undefined) { updates.push(`primary_color = $${index++}`); values.push(primary_color); }
        if (max_users !== undefined) { updates.push(`max_users = $${index++}`); values.push(max_users); }
        if (max_leads !== undefined) { updates.push(`max_leads = $${index++}`); values.push(max_leads); }
        if (settings !== undefined) { updates.push(`settings = $${index++}`); values.push(settings); }

        if (updates.length > 0) {
            values.push(req.params.id);
            await pool.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${index}`, values);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

// Delete a tenant
router.delete('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING name', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json({ success: true, message: `Tenant ${result.rows[0].name} deleted.` });
    } catch (err) {
        console.error('[SUPERADMIN] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete tenant.' });
    }
});

// Get system stats
router.get('/stats', async (req, res) => {
    try {
        const tenantsCount = await pool.query('SELECT COUNT(*) FROM tenants');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const revenue = await pool.query("SELECT SUM(amount) FROM subscriptions WHERE status = 'active'");
        res.json({
            totalTenants: parseInt(tenantsCount.rows[0].count),
            totalUsers: parseInt(usersCount.rows[0].count),
            mrr: parseFloat(revenue.rows[0].sum || 0)
        });
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all subscriptions across the platform
router.get('/subscriptions', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT s.*, t.name as tenant_name, t.slug as tenant_slug
            FROM subscriptions s
            JOIN tenants t ON s.tenant_id = t.id
            ORDER BY s.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch global subscriptions' });
    }
});

module.exports = router;
