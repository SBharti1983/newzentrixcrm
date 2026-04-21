const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { validateLead } = require('../middleware/validators');
const automationService = require('../services/automationService');
const { sendPushNotification } = require('../utils/push');
const { cacheResponse } = require('../middleware/cache');
const redis = require('../db/redis');
const { calculateLeadScore } = require('../utils/scoring');

const router = express.Router();
router.use(auth);

// GET /api/leads/export-calls
router.get('/export-calls', async (req, res) => {
    try {
        const { agentId, startDate, endDate } = req.query;
        let query = `
            SELECT i.*, l.name as lead_name, l.phone as lead_phone, u.name as agent_name, u.phone as agent_phone, u.role as designation
            FROM interactions i
            JOIN leads l ON i.lead_id = l.id
            JOIN users u ON i.user_id = u.id
            WHERE i.type = 'Call' AND i.tenant_id = $1
        `;
        const params = [req.tenantId];
        let i = 2;

        if (agentId && agentId !== 'All') {
            query += ` AND i.user_id = $${i++}`;
            params.push(agentId);
        }
        if (startDate) {
            query += ` AND i.date >= $${i++}`;
            params.push(startDate);
        }
        if (endDate) {
            // Include full end date
            query += ` AND i.date <= $${i++}`;
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            params.push(end.toISOString());
        }

        query += ` ORDER BY i.date DESC`;
        
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Export calls error:', err);
        res.status(500).json({ error: 'Failed to fetch call records' });
    }
});

const fs = require('fs');
const path = require('path');
const os = require('os');

// POST /api/leads/generate-physical-report
router.post('/generate-physical-report', async (req, res) => {
    try {
        const { csvContent, filename } = req.body;
        if (!csvContent || !filename) return res.status(400).json({ error: 'Content and filename required' });

        // 1. Primary Save (Project Exports Folder)
        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
        const filePath = path.join(exportsDir, filename);
        
        fs.writeFileSync(filePath, '\ufeff' + csvContent, 'utf8');

        // 2. Secondary Save (Windows Downloads Folder) - FORCING it to user's view
        let downloadedPath = null;
        try {
            const downloadsFolder = path.join(os.homedir(), 'Downloads');
            if (fs.existsSync(downloadsFolder)) {
                downloadedPath = path.join(downloadsFolder, filename);
                fs.writeFileSync(downloadedPath, '\ufeff' + csvContent, 'utf8');
                console.log(`[REPORT ENGINE] Forced copy to Downloads: ${downloadedPath}`);
            }
        } catch (e) {
            console.warn('[REPORT ENGINE] Could not reach Windows Downloads folder:', e.message);
        }
        
        res.json({ 
            success: true, 
            path: filePath,
            downloadsPath: downloadedPath,
            message: downloadedPath 
                ? `Report saved directly into your Windows Downloads folder!` 
                : `Report saved to server/exports/${filename}`
        });
    } catch (err) {
        console.error('Physical report gen error:', err);
        res.status(500).json({ error: 'Failed to save physical report' });
    }
});



// GET /api/leads/:id/matches - Find suggested properties
router.get('/:id/matches', async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) return res.status(400).json({ error: 'Invalid Lead ID' });
    try {
        const { rows: leads } = await pool.query('SELECT budget, property_type FROM leads WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        if (!leads[0]) return res.json([]);

        const lead = leads[0];
        const budgetValue = parseFloat(lead.budget) || 10000000; // Default if not set

        // Logic: Find units within 20% range of budget or same type
        const { rows: projects } = await pool.query(
            `SELECT i.*, p.name as project_name 
             FROM inventory i 
             JOIN projects p ON i.project_id = p.id 
             WHERE i.tenant_id = $1 
             AND (i.base_price <= $2 * 1.5)
             AND (i.status = 'Available' OR i.status IS NULL)
             LIMIT 4`,
            [req.tenantId, budgetValue]
        );
        res.json(projects);
    } catch (err) {
        console.error('Match error:', err);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
    // UUID Validation Check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
        return res.status(400).json({ error: 'Invalid Lead ID format (Expected UUID)' });
    }

    try {
        const { rows } = await pool.query(
            `SELECT l.*, cust_map.id as customer_id, u.name as agent_name, u.avatar as agent_avatar, u.role as agent_role, u.phone as agent_phone, u.email as agent_email,
                p.name as project_name,
                (SELECT u2.name FROM activity_log al JOIN users u2 ON al.user_id = u2.id WHERE al.entity_id::uuid = l.id AND al.entity_type = 'lead' AND al.action = 'created' LIMIT 1) as created_by_name,
                (
                    SELECT json_agg(merged_activity ORDER BY date DESC)
                    FROM (
                        SELECT id, type, date, note, 
                               (SELECT name FROM users WHERE id = interactions.user_id) as agent_name,
                               'interaction' as entry_type
                        FROM interactions WHERE lead_id = l.id
                        UNION ALL
                        SELECT id, 
                               CASE 
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'budget' IS DISTINCT FROM old_data::jsonb->>'budget') THEN 'Budget Update'
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'stage' IS DISTINCT FROM old_data::jsonb->>'stage') THEN 'Stage Advance'
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'status' IS DISTINCT FROM old_data::jsonb->>'status') THEN 'Status Change'
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'property_type' IS DISTINCT FROM old_data::jsonb->>'property_type') THEN 'Property Update'
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'project_id' IS DISTINCT FROM old_data::jsonb->>'project_id') THEN 'Project Pivot'
                                 ELSE INITCAP(action)
                               END as type,
                               created_at as date, 
                               CASE 
                                 WHEN LOWER(TRIM(action)) = 'booking_created' THEN 'Deal Booked: ' || COALESCE(new_data::jsonb->>'unit_no', 'N/A') || ' (' || COALESCE(new_data::jsonb->>'total_amount', '0') || ')'
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'budget' IS DISTINCT FROM old_data::jsonb->>'budget') THEN 'Budget updated to ' || COALESCE(new_data::jsonb->>'budget', 'None')
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'stage' IS DISTINCT FROM old_data::jsonb->>'stage') THEN 'Stage advanced to ' || COALESCE(new_data::jsonb->>'stage', 'None')
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'property_type' IS DISTINCT FROM old_data::jsonb->>'property_type') THEN 'Property Type updated to ' || COALESCE(new_data::jsonb->>'property_type', 'None')
                                 WHEN LOWER(TRIM(action)) = 'updated' AND (new_data::jsonb->>'project_id' IS DISTINCT FROM old_data::jsonb->>'project_id') THEN 'Target Project updated'
                                 ELSE action 
                               END as note,
                               (SELECT name FROM users WHERE id = activity_log.user_id) as agent_name,
                               'system' as entry_type
                        FROM activity_log WHERE (entity_type = 'lead' AND entity_id::uuid = l.id) OR (entity_type = 'contact' AND entity_id::uuid = l.id)
                    ) merged_activity
                ) as interactions,
                (
                    SELECT json_agg(deal) FROM (
                        SELECT b.id, b.status, b.total_amount, COALESCE(i.unit_no, b.unit_no) as unit_number, i.floor, proj.name as project_name
                        FROM bookings b
                        JOIN customers c ON b.customer_id = c.id
                        LEFT JOIN inventory i ON b.inventory_id = i.id
                        LEFT JOIN projects proj ON b.project_id = proj.id
                        WHERE c.lead_id = l.id

                    ) deal
                ) as deals,
                (
                    WITH RECURSIVE hierarchy AS (
                        SELECT id, name, avatar, role, phone, email, reports_to FROM users WHERE id = l.assigned_to
                        UNION ALL
                        SELECT u.id, u.name, u.avatar, u.role, u.phone, u.email, u.reports_to
                        FROM users u
                        INNER JOIN hierarchy h ON h.reports_to = u.id
                    )
                    SELECT json_agg(h) FROM hierarchy h
                ) as team
             FROM leads l
             LEFT JOIN users u ON l.assigned_to = u.id
             LEFT JOIN projects p ON l.project_id = p.id
             LEFT JOIN customers cust_map ON cust_map.lead_id = l.id
             WHERE l.id = $1 AND l.tenant_id = $2`, [req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
        const lead = rows[0];

        // Access check for non-admins
        if (req.user.role !== 'admin') {
            const isAssigned = lead.assigned_to === req.user.id;
            if (!isAssigned) {
                if (req.user.role === 'agent') return res.status(403).json({ error: 'Access denied' });
                
                // Check if lead belongs to someone in their downline
                const { rows: ownerR } = await pool.query('SELECT reports_to FROM users WHERE id = $1', [lead.assigned_to]);
                const ownerReportsTo = ownerR[0]?.reports_to;
                
                if (req.user.role === 'team_leader') {
                    if (ownerReportsTo !== req.user.id) return res.status(403).json({ error: 'Access denied' });
                } else if (req.user.role === 'sales_manager') {
                    // Check if owner reports to manager OR reports to a TL who reports to manager
                    const { rows: tlR } = await pool.query('SELECT reports_to FROM users WHERE id = $1', [ownerReportsTo]);
                    const managerOfTL = tlR[0]?.reports_to;
                    if (ownerReportsTo !== req.user.id && managerOfTL !== req.user.id && lead.assigned_to !== null) {
                        return res.status(403).json({ error: 'Access denied' });
                    }
                }
            }
        }
        res.json(lead);
    } catch (_err) {
        console.error('[GET /api/leads/:id] Error:', _err);
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
});

// GET /api/leads — list with filters + search + pagination
router.get('/', (req, res, next) => {
    // Only use cache for non-search list requests
    // if (req.query.q) return next();
    // return cacheResponse(60)(req, res, next);
    return next();
}, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    let { stage, source, priority, agent, q, channel_partner_id, status, startDate, endDate } = req.query;
    if (q) q = q.trim();
    const offset = (page - 1) * limit;
    const conditions = [`l.tenant_id = $1`];
    const params = [req.tenantId];
    let i = 2;

    if (stage) { conditions.push(`l.stage = $${i++}`); params.push(stage); }
    if (source) { conditions.push(`l.source = $${i++}`); params.push(source); }
    if (priority) { conditions.push(`l.priority = $${i++}`); params.push(priority); }
    if (agent) { 
        if (agent === 'Unassigned') {
            conditions.push(`l.assigned_to IS NULL`);
        } else {
            conditions.push(`l.assigned_to = $${i++}`); params.push(agent);
        }
    }
    if (channel_partner_id) { conditions.push(`l.channel_partner_id = $${i++}`); params.push(channel_partner_id); }
    // Only apply status filter if we are NOT doing a targeted nurture_due/overdue search
    // to avoid conflicting status conditions (e.g. status='Active' AND status='Nurture')
    if (status && !req.query.nurture_due && !req.query.nurture_overdue) { 
        conditions.push(`l.status = $${i++}`); params.push(status); 
    }

    if (startDate) {
        conditions.push(`l.created_at::date >= $${i++}`);
        params.push(startDate);
    }
    if (endDate) {
        conditions.push(`l.created_at::date <= $${i++}`);
        params.push(endDate);
    }

    if (req.query.nurture_due === 'true') {
        // Show Nurture leads with a reconnect date today or earlier
        conditions.push(`l.reconnect_date <= CURRENT_DATE AND l.status = 'Nurture'`);
    } else if (req.query.nurture_overdue === 'true') {
        conditions.push(`l.reconnect_date < CURRENT_DATE AND l.status = 'Nurture'`);
    } else if (req.query.reconnect_date) {
        conditions.push(`l.reconnect_date = $${i++}`);
        params.push(req.query.reconnect_date);
    }
    if (q) { conditions.push(`(l.name ILIKE $${i} OR l.city ILIKE $${i} OR l.phone ILIKE $${i} OR l.email ILIKE $${i})`); params.push(`%${q}%`); i++; }

    // Hierarchy Filter
    if (req.user.role === 'agent') {
        conditions.push(`l.assigned_to = $${i++}`);
        params.push(req.user.id);
    } else if (req.user.role === 'team_leader') {
        // Team Leader sees leads assigned to them OR their team members
        conditions.push(`(l.assigned_to = $${i} OR l.assigned_to IN (SELECT id FROM users WHERE reports_to = $${i}))`);
        params.push(req.user.id);
        i++;
    } else if (req.user.role === 'sales_manager') {
        // Sales Manager sees leads assigned to them OR their downline (TLs and Agents)
        // We use a CTE or IN clause to find all users reporting to them directly or reporting to someone who reports to them
        conditions.push(`(
            l.assigned_to = $${i} 
            OR l.assigned_to IN (
                SELECT id FROM users WHERE reports_to = $${i}
                UNION
                SELECT id FROM users WHERE reports_to IN (SELECT id FROM users WHERE reports_to = $${i})
            )
            OR l.assigned_to IS NULL
        )`);
        params.push(req.user.id);
        i++;
    }

    const where = conditions.join(' AND ');

    try {
        const [dataRes, countRes, nurtureStats] = await Promise.all([
            pool.query(
                `SELECT l.*, u.name as agent_name, u.avatar as agent_avatar, p.name as project_name,
                        (SELECT u2.name FROM activity_log al JOIN users u2 ON al.user_id = u2.id WHERE al.entity_id::uuid = l.id AND al.entity_type = 'lead' AND al.action = 'created' LIMIT 1) as created_by_name
                 FROM leads l
                 LEFT JOIN users u ON l.assigned_to = u.id
                 LEFT JOIN projects p ON l.project_id = p.id
                 WHERE ${where}
                 ORDER BY l.created_at DESC, l.id DESC
                 LIMIT $${i} OFFSET $${i + 1}`,
                [...params, limit, offset]
            ),
            pool.query(`SELECT COUNT(*) FROM leads l WHERE ${where}`, params),
            pool.query(
                `SELECT 
                    COUNT(*) FILTER (WHERE reconnect_date = CURRENT_DATE AND status = 'Nurture') as due_today,
                    COUNT(*) FILTER (WHERE reconnect_date < CURRENT_DATE AND status = 'Nurture') as overdue
                 FROM leads WHERE tenant_id = $1`,
                [req.tenantId]
            )
        ]);

        res.json({
            data: dataRes.rows,
            total: parseInt(countRes.rows[0].count),
            counts: {
                dueToday: parseInt(nurtureStats.rows[0].due_today),
                overdue: parseInt(nurtureStats.rows[0].overdue)
            },
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// POST /api/leads/bulk-update
router.post('/bulk-update', async (req, res) => {
    const { leadIds, updates } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: 'leadIds array is required' });
    }
    const allowed = ['stage', 'assigned_to', 'priority', 'score', 'status'];
    const validUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(validUpdates).length) return res.status(400).json({ error: 'No valid fields to update' });

    const setClauses = Object.keys(validUpdates).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(validUpdates);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query(
            `UPDATE leads SET ${setClauses} WHERE id = ANY($1) AND tenant_id = $2 RETURNING id`,
            [leadIds, req.tenantId, ...values]
        );

        // Simple activity log for bulk action
        await client.query(
            `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, new_data)
             VALUES ($1,$2,'lead',NULL,'bulk_updated',$3)`,
            [req.tenantId, req.user.id, JSON.stringify({ count: rows.length, updates: validUpdates })]
        );

        if (validUpdates.assigned_to && String(validUpdates.assigned_to) !== String(req.user.id)) {
            req.io.to(`user_${validUpdates.assigned_to}`).emit('notification', {
                title: 'Bulk Leads Assigned',
                message: `You have been assigned ${rows.length} new leads.`,
                type: 'lead_assigned',
            });
        }
        await client.query('COMMIT');

        // Flush cache on lead update
        await redis.del(`cache:/api/leads*|tenantId:${req.tenantId}*`);
        await redis.del(`dash:${req.tenantId}:*`);

        res.json({ message: 'Leads updated successfully', count: rows.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk update error:', err);
        res.status(500).json({ error: 'Failed to bulk update leads' });
    } finally {
        client.release();
    }
});

// POST /api/leads/bulk-delete
router.post('/bulk-delete', async (req, res) => {
    if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: 'leadIds array is required' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rowCount } = await client.query(
            `DELETE FROM leads WHERE id = ANY($1) AND tenant_id = $2`,
            [leadIds, req.tenantId]
        );
        await client.query('COMMIT');

        // Flush cache on lead deletion
        await redis.del(`cache:/api/leads*|tenantId:${req.tenantId}*`);
        await redis.del(`dash:${req.tenantId}:*`);

        res.json({ message: 'Leads deleted successfully', count: rowCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk delete error:', err);
        res.status(500).json({ error: 'Failed to bulk delete leads' });
    } finally {
        client.release();
    }
});



// Helper: convert empty strings to null for nullable/FK fields
function emptyToNull(val) {
    if (val === '' || val === undefined) return null;
    return val;
}

// POST /api/leads
router.post('/', validateLead, async (req, res) => {
    try {        // Plan limit enforcement
        console.log(`[POST /leads] Starting lead creation for tenant ${req.tenantId}...`);
        const { rows: [tenant] } = await pool.query(`SELECT max_leads FROM tenants WHERE id=$1`, [req.tenantId]);
        if (!tenant) {
            return res.status(400).json({ error: 'Tenant not found' });
        }
        const { rows: [leadCount] } = await pool.query(`SELECT COUNT(*) FROM leads WHERE tenant_id=$1`, [req.tenantId]);
        if (parseInt(leadCount.count) >= tenant.max_leads) {
            return res.status(403).json({ error: `Lead limit reached (${tenant.max_leads}). Please upgrade your plan.` });
        }

        const {
            name, phone, email, city, source, stage, priority, score,
            property_type, project_id, budget, assigned_to, notes, channel_partner_id, status,
            nurture_reason, reconnect_date
        } = req.body;

        console.log(`[POST /leads] Data received for: ${name} (${phone})`);

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        // Duplicate check by phone within tenant
        const dup = await pool.query(`SELECT id FROM leads WHERE tenant_id=$1 AND phone=$2`, [req.tenantId, phone]);
        if (dup.rows.length) {
            console.log(`[POST /leads] Duplicate detected: ${phone}`);
            return res.status(409).json({ error: 'A lead with this phone number already exists.', existing_id: dup.rows[0].id });
        }

        // Sanitize all nullable/FK fields — double insurance against empty string UUIDs
        const safeProjectId = emptyToNull(project_id);
        let safeAssignedTo = emptyToNull(assigned_to);
        const safeChannelPartnerId = emptyToNull(channel_partner_id);
        const safeScore = (typeof score === 'number' && !isNaN(score)) ? score : 50;

        // AUTO-ASSIGNMENT LOGIC: If an agent creates a lead and doesn't explicitly assign it,
        // assign it to them automatically so they don't "lose" it in their filtered view.
        if (!safeAssignedTo && req.user.role === 'agent') {
            safeAssignedTo = req.user.id;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, priority, score, property_type, project_id, budget, assigned_to, notes, channel_partner_id, status, last_contact_at, nurture_reason, reconnect_date)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),$17,$18) RETURNING *`,
                [req.tenantId, name, phone, emptyToNull(email), emptyToNull(city), source || 'Website', stage || 'New',
                priority || 'Medium', safeScore, emptyToNull(property_type), safeProjectId, emptyToNull(budget),
                    safeAssignedTo, emptyToNull(notes), safeChannelPartnerId, status || 'Active', nurture_reason || null, emptyToNull(reconnect_date)]
            );

            const newLead = rows[0];

            // Trigger Automated Workflows (Round Robin, Notifications, etc.)
            automationService.handleLeadCreate(newLead, req.io).catch(err => {
                console.error('[Automation Trigger] Error executing workflows:', err);
            });

            // Auto-create Nurture Followup if applicable
            if (newLead.status === 'Nurture' && newLead.reconnect_date) {
                try {
                    await client.query(
                        `INSERT INTO followups (tenant_id, lead_id, assigned_to, type, scheduled_at, note)
                         VALUES ($1, $2, $3, 'Nurture Reconnection', $4, $5)`,
                        [req.tenantId, newLead.id, newLead.assigned_to, newLead.reconnect_date, `Nurture follow-up: ${newLead.nurture_reason}`]
                    );
                } catch (fErr) {
                    console.error('[Nurture Auto-Followup] Failed:', fErr.message);
                }
            }

            await client.query('COMMIT');
            
            // --- NON-BLOCKING BACKGROUND TASKS ---
            
            // 1. Activity Log
            pool.query(
                `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, new_data)
                 VALUES ($1, $2, 'lead', $3, 'created', $4)`,
                [req.tenantId, req.user.id, newLead.id, JSON.stringify(newLead)]
            ).catch(err => console.error('[Activity Log] Background error:', err.message));

            // 2. Trigger automated workflows
            automationService.handleLeadCreate(newLead, req.io).catch(err => {
                console.error('[Automation Trigger] Background error:', err);
            });

            // 3. Notify assigned agent
            if (newLead.assigned_to && String(newLead.assigned_to) !== String(req.user.id) && req.io) {
                req.io.to(`user_${newLead.assigned_to}`).emit('notification', {
                    title: 'New Lead Assigned',
                    message: `You have been assigned a new lead: ${name}`,
                    type: 'lead_assigned',
                    data: newLead
                });
            }

            // 4. Flush cache
            redis.del(`cache:/api/leads*|tenantId:${req.tenantId}*`);
            redis.del(`dash:${req.tenantId}:*`);

            console.log(`[POST /leads] Success! Lead ID: ${newLead.id}`);
            res.status(201).json(newLead);
        } catch (err) {
            console.log(`[POST /leads] Error occurred, rolling back:`, err.message);
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[POST /leads] Route Error:', err.message);
        res.status(500).json({ error: err.message || 'Failed to create lead' });
    }
});

// POST /api/leads/:id/interactions
router.post('/:id/interactions', async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) return res.status(400).json({ error: 'Invalid Lead ID' });
    const { type, date, duration, note, outcome } = req.body;
    try {
        const { rows } = await pool.query(
            `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, duration, note, outcome)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.tenantId, req.params.id, req.user.id, type || 'Note', date || new Date(), duration || null, note || null, outcome || null]
        );

        // --- AUTOMATIC AI RE-SCORING TRIGGER ---
        // Fire and forget re-calculation in background so we don't block the API response
        calculateLeadScore(req.params.id, req.tenantId).catch(err => {
            console.error('[AUTO SCORING] Background job failed:', err.message);
        });

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Failed to add interaction', err);
        res.status(500).json({ error: 'Failed to add interaction' });
    }
});

// PATCH /api/leads/:leadId/interactions/:interactionId
router.patch('/:leadId/interactions/:interactionId', async (req, res) => {
    const { note, outcome, duration } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE interactions 
             SET note = COALESCE($1, note), 
                 outcome = COALESCE($2, outcome), 
                 duration = COALESCE($3, duration) 
             WHERE id = $4 AND lead_id = $5 AND tenant_id = $6 
             RETURNING *`,
            [note, outcome, duration, req.params.interactionId, req.params.leadId, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Interaction not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Failed to update interaction:', err);
        res.status(500).json({ error: 'Failed to update interaction' });
    }
});

// DELETE /api/leads/:leadId/interactions/:interactionId
router.delete('/:leadId/interactions/:interactionId', async (req, res) => {
    try {
        const { interactionId, leadId } = req.params;
        console.log(`[Interaction Delete] Request for ID: ${interactionId}, Lead in URL: ${leadId}, Tenant: ${req.tenantId}`);
        
        const { rowCount } = await pool.query(
            `DELETE FROM interactions WHERE id = $1 AND tenant_id = $2`,
            [interactionId, req.tenantId]
        );
        
        if (rowCount === 0) {
            console.warn(`[Interaction Delete] FAILED: Interaction ${interactionId} not found for Tenant ${req.tenantId}`);
            return res.status(404).json({ error: 'Interaction not found with provided context' });
        }
        
        console.log(`[Interaction Delete] SUCCESS: Removed interaction ${interactionId}`);
        res.json({ message: 'Interaction deleted successfully' });
    } catch (err) {
        console.error('[Interaction Delete] ERROR:', err);
        res.status(500).json({ error: 'Failed to delete interaction', details: err.message });
    }
});

// POST /api/leads/:id/deals
router.post('/:id/deals', async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) return res.status(400).json({ error: 'Invalid Lead ID' });
    try {
        const { unit_number, project_name, total_amount, status } = req.body;
        if (!total_amount) return res.status(400).json({ error: 'Total amount is required' });

        // First find or create a customer from this lead
        const leadRes = await pool.query('SELECT * FROM leads WHERE id=$1 AND tenant_id=$2', [req.params.id, req.tenantId]);
        if (!leadRes.rows[0]) return res.status(404).json({ error: 'Lead not found' });
        const lead = leadRes.rows[0];

        let customerId;
        const custRes = await pool.query('SELECT id FROM customers WHERE lead_id=$1 AND tenant_id=$2', [req.params.id, req.tenantId]);
        if (custRes.rows[0]) {
            customerId = custRes.rows[0].id;
        } else {
            const newCust = await pool.query(
                `INSERT INTO customers (tenant_id, name, phone, email, lead_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [req.tenantId, lead.name, lead.phone, lead.email, lead.id]
            );
            customerId = newCust.rows[0].id;
        }

        // We use a dummy project or find a matched project if provided
        let projectId = null;
        if (project_name) {
            const projRes = await pool.query('SELECT id FROM projects WHERE name ILIKE $1 AND tenant_id=$2 LIMIT 1', [project_name, req.tenantId]);
            if (projRes.rows[0]) projectId = projRes.rows[0].id;
        }
        if (!projectId) {
            const fallRes = await pool.query('SELECT id FROM projects WHERE tenant_id=$1 LIMIT 1', [req.tenantId]);
            if (fallRes.rows[0]) projectId = fallRes.rows[0].id;
        }

        const { rows } = await pool.query(
            `INSERT INTO bookings (tenant_id, customer_id, project_id, unit_no, total_amount, status)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [req.tenantId, customerId, projectId, unit_number || 'N/A', total_amount, status || 'Active']
        );

        // Activity log
        await pool.query(
            `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, new_data)
             VALUES ($1, $2, 'lead', $3, 'booking_created', $4)`,
            [req.tenantId, req.user.id, req.params.id, JSON.stringify(rows[0])]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Failed to add deal', err);
        res.status(500).json({ error: 'Failed to add deal' });
    }
});

// PATCH /api/leads/:id
router.patch('/:id', async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) return res.status(400).json({ error: 'Invalid Lead ID' });
    const allowed = ['name', 'phone', 'email', 'city', 'source', 'stage', 'priority', 'score', 'property_type', 'project_id', 'budget', 'assigned_to', 'notes', 'last_contact_at', 'channel_partner_id', 'status', 'nurture_reason', 'reconnect_date'];
    // Convert empty strings to null for UUID/nullable foreign key fields
    const nullableFields = ['email', 'city', 'property_type', 'project_id', 'budget', 'assigned_to', 'notes', 'channel_partner_id', 'reconnect_date'];
    const raw = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const updates = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, nullableFields.includes(k) ? emptyToNull(v) : v])
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(updates);

    try {
        // Get old data for audit log
        const old = await pool.query(`SELECT * FROM leads WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
        if (!old.rows[0]) return res.status(404).json({ error: 'Lead not found' });
        const lead = old.rows[0];

        // Access check for non-admins
        if (req.user.role !== 'admin') {
            const isAssigned = lead.assigned_to === req.user.id;
            if (!isAssigned) {
                if (req.user.role === 'agent') return res.status(403).json({ error: 'Access denied' });
                
                const { rows: ownerR } = await pool.query('SELECT reports_to FROM users WHERE id = $1', [lead.assigned_to]);
                const ownerReportsTo = ownerR[0]?.reports_to;
                
                if (req.user.role === 'team_leader') {
                    if (ownerReportsTo !== req.user.id) return res.status(403).json({ error: 'Access denied' });
                } else if (req.user.role === 'sales_manager') {
                    const { rows: tlR } = await pool.query('SELECT reports_to FROM users WHERE id = $1', [ownerReportsTo]);
                    const managerOfTL = tlR[0]?.reports_to;
                    if (ownerReportsTo !== req.user.id && managerOfTL !== req.user.id && lead.assigned_to !== null) {
                        return res.status(403).json({ error: 'Access denied' });
                    }
                }
            }
        }

        const { rows } = await pool.query(
            `UPDATE leads SET ${setClauses} WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...values]
        );

        try {
            await pool.query(
                `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, old_data, new_data)
                 VALUES ($1,$2,'lead',$3,'updated',$4,$5)`,
                [req.tenantId, req.user.id, req.params.id, JSON.stringify(old.rows[0]), JSON.stringify(rows[0])]
            );
        } catch (logErr) {
            console.error('[Activity Log] Non-critical error:', logErr.message);
        }

        if (updates.assigned_to && String(updates.assigned_to) !== String(old.rows[0].assigned_to) && String(updates.assigned_to) !== String(req.user.id) && req.io) {
            req.io.to(`user_${updates.assigned_to}`).emit('notification', {
                title: 'Lead Reassigned',
                message: `Lead ${rows[0].name} has been reassigned to you.`,
                type: 'lead_assigned',
                data: rows[0]
            });
        }

        // Trigger Stage Change automation if stage updated
        if (updates.stage && updates.stage !== old.rows[0].stage) {
            automationService.handleStageChange(rows[0], old.rows[0].stage, updates.stage, req.io).catch(err => {
                console.error('[Automation Trigger] Stage change error:', err);
            });

            // If Lead becomes HOT, send targeted push notification to assigned agent
            if (updates.stage === 'Hot') {
                const targetUserId = rows[0].assigned_to;
                if (targetUserId) {
                    pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [targetUserId])
                        .then(({ rows: subs }) => {
                            subs.forEach(sub => {
                                sendPushNotification(sub, {
                                    title: '🔥 HOT LEAD DETECTED!',
                                    body: `${rows[0].name} just peaked in interest! Strike while the iron is hot.`,
                                    data: {
                                        url: `/leads/${rows[0].id}`,
                                        leadId: rows[0].id
                                    }
                                }).catch(e => console.error('Push failed for sub:', sub.endpoint, e));
                            });
                        });
                }
            }
        }

        // Auto-create Nurture Followup if status changed to Nurture
        if (updates.status === 'Nurture' && updates.reconnect_date && old.rows[0].status !== 'Nurture') {
            try {
                await pool.query(
                    `INSERT INTO followups (tenant_id, lead_id, assigned_to, type, scheduled_at, note)
                     VALUES ($1, $2, $3, 'Nurture Reconnection', $4, $5)`,
                    [req.tenantId, req.params.id, rows[0].assigned_to, updates.reconnect_date, `Nurture follow-up: ${updates.nurture_reason}`]
                );
            } catch (fErr) {
                console.error('[Nurture Auto-Followup] Failed:', fErr.message);
            }
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('[PATCH /leads/:id] Error:', err.message, err.detail || '');
        res.status(500).json({ error: err.message || 'Failed to update lead' });
    }
});

// DELETE /api/leads/:id  (admin/manager only)
router.delete('/:id', async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) return res.status(400).json({ error: 'Invalid Lead ID' });
    if (!['superadmin', 'admin', 'sales_manager'].includes(req.user.role))
        return res.status(403).json({ error: 'Insufficient permissions' });
    try {
        await pool.query(`DELETE FROM leads WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
        res.json({ message: 'Lead deleted' });
    } catch (_err) {
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});


// GET /api/leads/:id/followups
router.get('/:id/followups', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT f.*, u.name as agent_name FROM followups f
             LEFT JOIN users u ON f.assigned_to = u.id
             WHERE f.lead_id = $1 AND f.tenant_id = $2 ORDER BY f.scheduled_at DESC`,
            [req.params.id, req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /leads/:id/followups error:', err);
        res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
});

const { GoogleGenAI } = require('@google/genai');

// POST /api/leads/:id/ai-score
// Manual trigger for deep AI scoring recalculation
router.post('/:id/ai-score', async (req, res) => {
    try {
        const result = await calculateLeadScore(req.params.id, req.tenantId);
        if (!result) return res.status(404).json({ error: 'Lead not found or update failed' });

        const { rows: updated } = await pool.query(`SELECT * FROM leads WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);

        res.json({ 
            newScore: result.score, 
            reasons: [result.reasoning, `Suggested Action: ${result.suggested_action}`], 
            lead: updated[0] || updated.rows[0], 
            message: 'AI intelligence evaluation complete' 
        });
    } catch (err) {
        console.error('AI Score error:', err);
        res.status(500).json({ error: 'Failed to generate AI score' });
    }
});

const xlsx = require('xlsx');
const secureUpload = require('../middleware/upload');

// POST /api/leads/import -> Excel/CSV import (uses tenant-isolated upload middleware)
router.post('/import', secureUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Plan limit enforcement for bulk imports
        const { rows: [tenant] } = await pool.query(`SELECT max_leads FROM tenants WHERE id=$1`, [req.tenantId]);
        const { rows: [leadCount] } = await pool.query(`SELECT COUNT(*) FROM leads WHERE tenant_id=$1`, [req.tenantId]);
        const currentCount = parseInt(leadCount.count);
        const remaining = tenant.max_leads - currentCount;

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(worksheet, { defval: null });
        console.log(`[IMPORT] Processing ${rows.length} rows from sheet "${sheetName}"...`);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ error: 'Empty file or invalid format' });
        }

        // Pre-fetch all users to map 'assigned_to'
        const { rows: allUsers } = await pool.query('SELECT id, email, name FROM users WHERE tenant_id=$1', [req.tenantId]);
        const userMap = new Map();
        allUsers.forEach(u => {
            userMap.set(u.id, u.id);
            if (u.email) userMap.set(u.email.toLowerCase(), u.id);
            if (u.name) userMap.set(u.name.toLowerCase(), u.id);
        });

        let importedCount = 0;
        let duplicateCount = 0;
        let skippedLimit = 0;

        for (const row of rows) {
            // Normalize header access to be case-insensitive
            const getVal = (fields) => {
                const keys = Object.keys(row);
                for (const f of fields) {
                    const normalizedF = f.toLowerCase().replace(/[\s_]/g, '');
                    const foundKey = keys.find(k => k.toLowerCase().replace(/[\s_]/g, '') === normalizedF);
                    if (foundKey) return row[foundKey];
                }
                return null;
            };

            const name = getVal(['Name', 'Lead Name']);
            const phoneVal = getVal(['Contact', 'Phone', 'Mobile', 'Number']);
            const phone = phoneVal ? String(phoneVal).trim() : '';
            const email = getVal(['Email']);
            const city = getVal(['City', 'Location']);
            const source = getVal(['Source']) || 'Import';
            const status = getVal(['Status']) || 'Active';
            const stage = getVal(['Stage']) || 'New';
            const budget = getVal(['Budget']);
            const scoreVal = getVal(['Score']);
            const score = (scoreVal && !isNaN(parseInt(scoreVal))) ? parseInt(scoreVal) : 50;
            
            const assignedToRaw = getVal(['Assigned To', 'Agent', 'Assigned']);
            let assignedTo = null;
            if (assignedToRaw) {
               assignedTo = userMap.get(String(assignedToRaw).trim().toLowerCase()) || null;
            }

            if (!name || !phone || phone === 'undefined' || phone === '') continue;

            if (importedCount >= remaining) {
                skippedLimit++;
                continue;
            }

            const dup = await pool.query(`SELECT id FROM leads WHERE tenant_id=$1 AND phone=$2`, [req.tenantId, phone]);
            if (dup.rows.length) {
                duplicateCount++;
                continue;
            }

            await pool.query(
                `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, priority, score, assigned_to, status, budget, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'Medium', $8, $9, $10, $11, NOW())`,
                [req.tenantId, name, phone, email || null, city || null, source, stage, score, assignedTo, status, budget || null]
            );
            importedCount++;
        }

        res.json({
            message: 'Import complete',
            imported: importedCount,
            duplicates: duplicateCount,
            ...(skippedLimit > 0 ? { skipped_plan_limit: skippedLimit, warning: `${skippedLimit} leads skipped due to plan limit (${tenant.max_leads} max).` } : {})
        });
    } catch (err) {
        console.error('Import Error:', err);
        res.status(500).json({ error: 'Failed to import leads' });
    }
});

module.exports = router;
