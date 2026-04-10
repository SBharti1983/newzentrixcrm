const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/users — list team members
router.get('/', async (req, res) => {
    const isSuperAdmin = req.user.role === 'superadmin';
    console.log(`[ACL] User ${req.user.email} (Role: ${req.user.role}) attempting to list users.`);
    
    if (!['admin', 'sales_manager', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const query = isSuperAdmin 
        ? `SELECT id, name, email, role, avatar, phone, department, is_active, last_login_at, created_at, reports_to, telephony_agent_id 
           FROM users WHERE is_active=TRUE ORDER BY role, name`
        : `SELECT id, name, email, role, avatar, phone, department, is_active, last_login_at, created_at, reports_to, telephony_agent_id
           FROM users WHERE tenant_id=$1 AND is_active=TRUE ORDER BY role, name`;
    
    const { rows } = await pool.query(query, isSuperAdmin ? [] : [req.tenantId]);
    res.json(rows);
});

// POST /api/users — add new team member (admin/manager/superadmin)
router.post('/', async (req, res) => {
    if (!['admin', 'sales_manager', 'team_leader', 'superadmin'].includes(req.user.role))
        return res.status(403).json({ error: 'Admin/Manager/TL/SuperAdmin only' });

    const { name, email, password, role, phone, department, reports_to, telephony_agent_id } = req.body;

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
    // Auto-set reports_to if not provided and creator is not admin/superadmin
    const finalReportsTo = reports_to || (['sales_manager', 'team_leader'].includes(req.user.role) ? req.user.id : null);

    const { rows } = await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role, phone, department, avatar, reports_to, telephony_agent_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, name, email, role, avatar, created_at, reports_to, telephony_agent_id`,
        [req.tenantId, name, email, hash, role || 'agent', phone || null, department || null,
        (name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)), finalReportsTo, telephony_agent_id || null]
    );
    res.status(201).json(rows[0]);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
    const isSuperAdmin = req.user.role === 'superadmin';
    const isPowerful = ['admin', 'superadmin'].includes(req.user.role);
    const id = req.params.id;

    console.log(`[USERS] Update requested for user ${id} by ${req.user.email}. Payload:`, req.body);

    // Determine target user's role first
    const { rows: trows } = await pool.query("SELECT role, tenant_id FROM users WHERE id=$1", [id]);
    if (!trows.length) return res.status(404).json({ error: 'User not found' });
    const targetUser = trows[0];

    // Tenant check: powerful users (admins) can only edit within their tenant. Superadmins can edit anyone.
    if (!isSuperAdmin && targetUser.tenant_id !== req.tenantId) {
        return res.status(403).json({ error: 'Cannot edit users from other workspaces' });
    }

    const isSelf = String(req.user.id) === String(id);
    const isManagerOfTarget = req.user.role === 'sales_manager' && ['team_leader', 'agent'].includes(targetUser.role);
    const isTLOfTarget = req.user.role === 'team_leader' && targetUser.role === 'agent';
    const canEdit = isPowerful || isSelf || isManagerOfTarget || isTLOfTarget;

    if (!canEdit)
        return res.status(403).json({ error: 'Insufficient permissions' });
        
    const allowed = ['name', 'email', 'phone', 'department', 'role', 'is_active', 'reports_to', 'telephony_agent_id'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    // Change password separately
    if (req.body.new_password) {
        const hash = await bcrypt.hash(req.body.new_password, 10);
        updates.password_hash = hash;
    }

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
    
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const set = keys.map((k, i) => `${k}=$${i + 2}`).join(',');
    
    console.log(`[USERS] Executing update: SET ${set} WHERE id=${id}`);
    
    const { rows } = await pool.query(
        `UPDATE users SET ${set} WHERE id=$1 RETURNING id, name, email, role, avatar, is_active, reports_to, telephony_agent_id`,
        [id, ...values]
    );
    
    console.log(`[USERS] Update complete. Result:`, rows[0]);
    res.json(rows[0]);
});

module.exports = router;
