const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/users — list team members (admin/manager only)
router.get('/', async (req, res) => {
    if (!['admin', 'sales_manager'].includes(req.user.role))
        return res.status(403).json({ error: 'Insufficient permissions' });
    const { rows } = await pool.query(
        `SELECT id, name, email, role, avatar, phone, department, is_active, last_login_at, created_at, reports_to
         FROM users WHERE tenant_id=$1 AND is_active=TRUE ORDER BY role, name`, [req.tenantId]
    );
    res.json(rows);
});

// POST /api/users — add new team member (admin/manager only)
router.post('/', async (req, res) => {
    // Admin, Sales Manager, and Team Leader can add members
    if (!['admin', 'sales_manager', 'team_leader'].includes(req.user.role))
        return res.status(403).json({ error: 'Admin/Manager/Team Leader only' });

    const { name, email, password, role, phone, department, reports_to } = req.body;

    // Hierarchy validation
    if (req.user.role === 'sales_manager' && !['team_leader', 'agent'].includes(role)) {
        return res.status(403).json({ error: 'Managers can only add Team Leaders or Agents' });
    }
    if (req.user.role === 'team_leader' && role !== 'agent') {
        return res.status(403).json({ error: 'Team Leaders can only add Sales Agents' });
    }

    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

    // Check plan limits
    const { rows: [count] } = await pool.query(
        `SELECT COUNT(*) FROM users WHERE tenant_id=$1 AND is_active=TRUE`, [req.tenantId]
    );
    const { rows: [tenant] } = await pool.query(`SELECT max_users FROM tenants WHERE id=$1`, [req.tenantId]);

    if (!tenant) return res.status(404).json({ error: 'Tenant record not found' });

    if (parseInt(count.count) >= tenant.max_users) {
        console.log(`[USERS] Limit reached for tenant ${req.tenantId}: ${count.count}/${tenant.max_users}`);
        return res.status(403).json({ error: `User limit reached (${tenant.max_users}). Please upgrade your plan or contact support.` });
    }

    // Duplicate email check (scoped to tenant)
    const { rows: [existing] } = await pool.query(`SELECT id FROM users WHERE tenant_id=$1 AND LOWER(email)=LOWER($2)`, [req.tenantId, email]);
    if (existing) return res.status(409).json({ error: 'A team member with this email already exists in your workspace.' });

    const hash = await bcrypt.hash(password, 10);
    // Auto-set reports_to if not provided and creator is not admin
    const finalReportsTo = reports_to || (['sales_manager', 'team_leader'].includes(req.user.role) ? req.user.id : null);

    const { rows } = await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role, phone, department, avatar, reports_to)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, email, role, avatar, created_at, reports_to`,
        [req.tenantId, name, email, hash, role || 'agent', phone || null, department || null,
        (name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)), finalReportsTo]
    );
    res.status(201).json(rows[0]);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const id = req.params.id;

    // Determine target user's role first (scoped to tenant)
    const { rows: trows } = await pool.query("SELECT role FROM users WHERE id=$1 AND tenant_id=$2", [id, req.tenantId]);
    if (!trows.length) return res.status(404).json({ error: 'User not found' });
    const targetRole = trows[0].role;

    // Use String() to avoid type mismatch (JWT id is number, params id is string)
    // Use String() to avoid type mismatch (JWT id is number, params id is string)
    const isSelf = String(req.user.id) === String(id);
    const isManagerOfTarget = req.user.role === 'sales_manager' && ['team_leader', 'agent'].includes(targetRole);
    const isTLOfTarget = req.user.role === 'team_leader' && targetRole === 'agent';
    const canEdit = isAdmin || isSelf || isManagerOfTarget || isTLOfTarget;

    if (!canEdit)
        return res.status(403).json({ error: 'Insufficient permissions' });
    const allowed = ['name', 'email', 'phone', 'department', 'role', 'is_active', 'reports_to'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    // Change password separately
    if (req.body.new_password) {
        const hash = await bcrypt.hash(req.body.new_password, 10);
        updates.password_hash = hash;
    }

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
    const set = Object.keys(updates).map((k, i) => `${k}=$${i + 3}`).join(',');
    const { rows } = await pool.query(
        `UPDATE users SET ${set} WHERE id=$1 AND tenant_id=$2 RETURNING id, name, email, role, avatar, is_active, reports_to`,
        [req.params.id, req.tenantId, ...Object.values(updates)]
    );
    res.json(rows[0]);
});

module.exports = router;
