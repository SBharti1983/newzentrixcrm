import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, users, tenants } from '../db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/users — list team members
router.get('/', async (req: any, res: Response) => {
    try {
        const isSuperAdmin = req.user.role === 'superadmin';
        console.log(`[ACL] User ${req.user.email} (Role: ${req.user.role}) attempting to list users.`);
        
        const allowedRoles = ['admin', 'sales_manager', 'superadmin', 'team_leader', 'agent'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const conditions = [eq(users.isActive, true)];
        if (!isSuperAdmin) {
            conditions.push(eq(users.tenantId, req.tenantId));
        }

        const results = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            avatar: users.avatar,
            phone: users.phone,
            department: users.department,
            isActive: users.isActive,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
            reportsTo: users.reportsTo,
            telephonyAgentId: users.telephonyAgentId
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.role), asc(users.name));

        res.json(results);
    } catch (err) {
        console.error('GET /users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users — add new team member (admin/manager/superadmin)
router.post('/', async (req: any, res: Response) => {
    try {
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
        const [userCountResult] = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(and(eq(users.tenantId, req.tenantId), eq(users.isActive, true)));

        const [tenantInfo] = await db.select({ maxUsers: tenants.maxUsers })
            .from(tenants)
            .where(eq(tenants.id, req.tenantId));

        if (!tenantInfo) return res.status(404).json({ error: 'Tenant record not found' });

        if (userCountResult.count >= (tenantInfo.maxUsers || 3)) {
            console.log(`[USERS] Limit reached for tenant ${req.tenantId}: ${userCountResult.count}/${tenantInfo.maxUsers}`);
            return res.status(403).json({ error: `User limit reached (${tenantInfo.maxUsers}). Please upgrade your plan or contact support.` });
        }

        // Duplicate email check (scoped to tenant)
        const [existing] = await db.select({ id: users.id })
            .from(users)
            .where(and(eq(users.tenantId, req.tenantId), sql`LOWER(${users.email}) = LOWER(${email})`));

        if (existing) return res.status(409).json({ error: 'A team member with this email already exists in your workspace.' });

        const hash = await bcrypt.hash(password, 10);
        // Auto-set reports_to if not provided and creator is not admin/superadmin
        const finalReportsTo = reports_to || (['sales_manager', 'team_leader'].includes(req.user.role) ? req.user.id : null);

        const newUser = await db.insert(users).values({
            tenantId: req.tenantId,
            name,
            email,
            passwordHash: hash,
            role: role || 'agent',
            phone: phone || null,
            department: department || null,
            avatar: (name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)),
            reportsTo: finalReportsTo,
            telephonyAgentId: telephony_agent_id || null
        }).returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            avatar: users.avatar,
            createdAt: users.createdAt,
            reportsTo: users.reportsTo,
            telephonyAgentId: users.telephonyAgentId
        });

        res.status(201).json(newUser[0]);
    } catch (err) {
        console.error('POST /users error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PATCH /api/users/:id
router.patch('/:id', async (req: any, res: Response) => {
    try {
        const isSuperAdmin = req.user.role === 'superadmin';
        const isPowerful = ['admin', 'superadmin'].includes(req.user.role);
        const id = req.params.id;

        console.log(`[USERS] Update requested for user ${id} by ${req.user.email}. Payload:`, req.body);

        // Determine target user's role first
        const [targetUser] = await db.select({ role: users.role, tenantId: users.tenantId })
            .from(users)
            .where(eq(users.id, id));

        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Tenant check: powerful users (admins) can only edit within their tenant. Superadmins can edit anyone.
        if (!isSuperAdmin && targetUser.tenantId !== req.tenantId) {
            return res.status(403).json({ error: 'Cannot edit users from other workspaces' });
        }

        const isSelf = String(req.user.id) === String(id);
        const isManagerOfTarget = req.user.role === 'sales_manager' && ['team_leader', 'agent'].includes(targetUser.role);
        const isTLOfTarget = req.user.role === 'team_leader' && targetUser.role === 'agent';
        const canEdit = isPowerful || isSelf || isManagerOfTarget || isTLOfTarget;

        if (!canEdit)
            return res.status(403).json({ error: 'Insufficient permissions' });
            
        const allowed = ['name', 'email', 'phone', 'department', 'role', 'is_active', 'reports_to', 'telephony_agent_id'];
        
        const updates: any = {};
        for (const [k, v] of Object.entries(req.body)) {
            if (allowed.includes(k)) {
                if (k === 'is_active') updates.isActive = v;
                else if (k === 'reports_to') updates.reportsTo = v;
                else if (k === 'telephony_agent_id') updates.telephonyAgentId = v;
                else updates[k] = v;
            }
        }

        // Change password separately
        if (req.body.new_password) {
            updates.passwordHash = await bcrypt.hash(req.body.new_password, 10);
        }

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
        
        console.log(`[USERS] Executing Drizzle update for user ${id}`);
        
        const updatedUser = await db.update(users)
            .set(updates)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                avatar: users.avatar,
                isActive: users.isActive,
                reportsTo: users.reportsTo,
                telephonyAgentId: users.telephonyAgentId
            });
        
        console.log(`[USERS] Update complete. Result:`, updatedUser[0]);
        res.json(updatedUser[0]);
    } catch (err) {
        console.error('PATCH /users/:id error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

export default router;
