import express, { Request, Response } from 'express';
import { db, projects, inventory, leads, enquiries, siteVisits, bookings } from '../db';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// GET /api/projects
router.get('/', async (req: any, res: Response) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;
        
        const conditions = [eq(projects.tenantId, req.tenantId)];
        if (status) {
            conditions.push(eq(projects.status, status as string));
        }

        const results = await db.select()
            .from(projects)
            .where(and(...conditions))
            .orderBy(desc(projects.createdAt))
            .limit(Number(limit))
            .offset(Number(offset));
            
        res.json(results);
    } catch (err) {
        console.error('GET /projects error:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/projects/:id
router.get('/:id', async (req: any, res: Response) => {
    try {
        // Using db.execute for complex aggregations (The 5% Rule)
        const { rows } = await db.execute(sql`
            SELECT p.*, COUNT(i.id) as total_units_db, COUNT(i.id) FILTER (WHERE i.status='Available') as available_units_db
             FROM projects p LEFT JOIN inventory i ON i.project_id = p.id
             WHERE p.id = ${req.params.id} AND p.tenant_id = ${req.tenantId} GROUP BY p.id
        `);
        if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /projects/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/projects - create a new project
router.post('/', async (req: any, res: Response) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager', 'agent'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const { name, location, type, status, total_units, available_units, price_range, rera_number, possession_date, amenities } = req.body;
        if (!name) return res.status(400).json({ error: 'Project name is required' });

        const newProject = await db.insert(projects).values({
            tenantId: req.tenantId,
            name,
            location: location || null,
            type: type || 'Residential',
            status: status || 'Active',
            totalUnits: total_units || 0,
            availableUnits: available_units || 0,
            priceRange: price_range || null,
            reraNumber: rera_number || null,
            possessionDate: possession_date || null,
            amenities: amenities || []
        }).returning();

        res.status(201).json(newProject[0]);
    } catch (err) {
        console.error('POST /projects error:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PATCH /api/projects/:id - update a project
router.patch('/:id', async (req: any, res: Response) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager', 'agent'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const allowed = ['name', 'location', 'type', 'status', 'total_units', 'available_units', 'price_range', 'rera_number', 'possession_date', 'amenities'];
        const updates: any = {};
        for (const [k, v] of Object.entries(req.body)) {
            if (allowed.includes(k)) {
                const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                updates[camelKey] = v;
            }
        }

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
        updates.updatedAt = new Date().toISOString();

        const updated = await db.update(projects)
            .set(updates)
            .where(and(eq(projects.id, req.params.id), eq(projects.tenantId, req.tenantId)))
            .returning();

        if (!updated[0]) return res.status(404).json({ error: 'Project not found' });
        res.json(updated[0]);
    } catch (err) {
        console.error('PATCH /projects/:id error:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// GET /api/projects/:id/inventory
router.get('/:id/inventory', async (req: any, res: Response) => {
    try {
        const { status, type, limit = 200, offset = 0 } = req.query;
        
        const conditions = [
            eq(inventory.projectId, req.params.id),
            eq(inventory.tenantId, req.tenantId)
        ];
        
        if (status) conditions.push(eq(inventory.status, status as string));
        if (type) conditions.push(eq(inventory.propertyType, type as string));

        const results = await db.select()
            .from(inventory)
            .where(and(...conditions))
            .orderBy(asc(inventory.floor), asc(inventory.unitNo))
            .limit(Number(limit))
            .offset(Number(offset));
            
        res.json(results);
    } catch (err) {
        console.error('GET /inventory error:', err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /api/projects/:id/inventory — add unit
router.post('/:id/inventory', async (req: any, res: Response) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });
            
        const { unit_no, floor, area_sqft, property_type, facing, base_price, status } = req.body;
        if (!unit_no) return res.status(400).json({ error: 'Unit number is required' });
        
        const newUnit = await db.insert(inventory).values({
            tenantId: req.tenantId,
            projectId: req.params.id,
            unitNo: unit_no,
            floor: floor || null,
            areaSqft: area_sqft || null,
            propertyType: property_type || null,
            facing: facing || null,
            basePrice: base_price || null,
            status: status || 'Available'
        }).returning();
        
        res.status(201).json(newUnit[0]);
    } catch (err: any) {
        if (err.code === '23505') return res.status(409).json({ error: 'Unit number already exists in this project' });
        console.error('POST /inventory error:', err);
        res.status(500).json({ error: 'Failed to add unit' });
    }
});

// PATCH /api/projects/:id/inventory/:unitId — update unit
router.patch('/:id/inventory/:unitId', async (req: any, res: Response) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const allowed = ['unit_no', 'floor', 'area_sqft', 'property_type', 'facing', 'base_price', 'status', 'parking'];
        const updates: any = {};
        for (const [k, v] of Object.entries(req.body)) {
            if (allowed.includes(k)) {
                const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                updates[camelKey] = v;
            }
        }

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
        updates.updatedAt = new Date().toISOString();

        const updated = await db.update(inventory)
            .set(updates)
            .where(and(
                eq(inventory.id, req.params.unitId),
                eq(inventory.projectId, req.params.id),
                eq(inventory.tenantId, req.tenantId)
            ))
            .returning();

        if (!updated[0]) return res.status(404).json({ error: 'Unit not found' });
        res.json(updated[0]);
    } catch (err) {
        console.error('PATCH /inventory error:', err);
        res.status(500).json({ error: 'Failed to update unit' });
    }
});

// DELETE /api/projects/:id - delete a project
router.delete('/:id', async (req: any, res: Response) => {
    try {
        if (!['superadmin', 'admin', 'sales_manager', 'agent'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        const projectId = req.params.id;
        const tenantId = req.tenantId;

        await db.transaction(async (tx) => {
            // Verify project exists
            const projectRows = await tx.select({ name: projects.name }).from(projects).where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)));
            if (!projectRows[0]) {
                throw new Error('NOT_FOUND');
            }
            
            const projectName = projectRows[0].name;

            // 1. Nullify lead references to this project
            await tx.update(leads).set({ projectId: null }).where(and(eq(leads.projectId, projectId), eq(leads.tenantId, tenantId)));

            // 2. Delete site visits for this project
            await tx.delete(siteVisits).where(and(eq(siteVisits.projectId, projectId), eq(siteVisits.tenantId, tenantId)));

            // 4. Handle bookings (Nullify project reference)
            await tx.update(bookings).set({ projectId: null }).where(and(eq(bookings.projectId, projectId), eq(bookings.tenantId, tenantId)));

            // 5. Delete inventory units associated with this project
            await tx.delete(inventory).where(and(eq(inventory.projectId, projectId), eq(inventory.tenantId, tenantId)));

            // 6. Delete the project itself
            await tx.delete(projects).where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)));

            res.json({ message: `Project "${projectName}" deleted successfully` });
        });

    } catch (err: any) {
        console.error('DELETE /projects/:id error:', err);
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
        
        // Handle remaining FK constraint violations gracefully
        if (err.code === '23503') {
            return res.status(400).json({ 
                error: `Cannot delete: this project is still referenced by other records (${err.constraint || 'unknown constraint'}). Please unlink related data first.` 
            });
        }
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
