const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { validateLead } = require('../middleware/validators');
const automationService = require('../services/automationService');

const router = express.Router();
router.use(auth);

// GET /api/leads/export-calls
router.get('/export-calls', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT i.*, l.name as lead_name, l.phone as lead_phone, u.name as agent_name
             FROM interactions i
             JOIN leads l ON i.lead_id = l.id
             JOIN users u ON i.user_id = u.id
             WHERE i.type = 'Call' AND i.tenant_id = $1
             ORDER BY i.date DESC`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Export calls error:', err);
        res.status(500).json({ error: 'Failed to fetch call records' });
    }
});

// GET /api/leads/search - Global search
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        const { rows } = await pool.query(
            "SELECT id, name, phone, email, stage FROM leads WHERE tenant_id = $1 AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2) LIMIT 10",
            [req.tenantId, `%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/leads/:id/matches - Find suggested properties
router.get('/:id/matches', async (req, res) => {
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
    try {
        const { rows } = await pool.query(
            `SELECT l.*, u.name as agent_name, u.avatar as agent_avatar, p.name as project_name,
                (
                    SELECT json_agg(merged_activity ORDER BY date DESC)
                    FROM (
                        SELECT 
                            id, 
                            type, 
                            date, 
                            note, 
                            (SELECT name FROM users WHERE id = interactions.user_id) as agent_name,
                            'interaction' as entry_type
                        FROM interactions 
                        WHERE lead_id = l.id
                        
                        UNION ALL
                        
                        SELECT 
                            id, 
                            action as type, 
                            created_at as date, 
                            CASE 
                                WHEN action = 'updated' AND (new_data->>'stage') IS NOT NULL 
                                THEN 'Stage progressed to ' || (new_data->>'stage')
                                ELSE action 
                            END as note,
                            (SELECT name FROM users WHERE id = activity_log.user_id) as agent_name,
                            'system' as entry_type
                        FROM activity_log 
                        WHERE entity_type = 'lead' AND entity_id::uuid = l.id
                    ) merged_activity
                ) as interactions,
                (
                    SELECT COUNT(b.id) 
                    FROM bookings b 
                    JOIN customers c ON b.customer_id = c.id 
                    WHERE c.lead_id = l.id
                ) as booking_count
             FROM leads l
             LEFT JOIN users u ON l.assigned_to = u.id
             LEFT JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND l.tenant_id = $2`, [req.params.id, req.tenantId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
        res.json(rows[0]);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
});

// GET /api/leads — list with filters + search + pagination
router.get('/', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const { stage, source, priority, agent, q, channel_partner_id } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [`l.tenant_id = $1`];
    const params = [req.tenantId];
    let i = 2;

    if (stage) { conditions.push(`l.stage = $${i++}`); params.push(stage); }
    if (source) { conditions.push(`l.source = $${i++}`); params.push(source); }
    if (priority) { conditions.push(`l.priority = $${i++}`); params.push(priority); }
    if (agent) { conditions.push(`l.assigned_to = $${i++}`); params.push(agent); }
    if (channel_partner_id) { conditions.push(`l.channel_partner_id = $${i++}`); params.push(channel_partner_id); }
    if (q) { conditions.push(`(l.name ILIKE $${i} OR l.city ILIKE $${i} OR l.phone ILIKE $${i} OR l.email ILIKE $${i})`); params.push(`%${q}%`); i++; }

    const where = conditions.join(' AND ');

    try {
        const [dataRes, countRes] = await Promise.all([
            pool.query(
                `SELECT l.*, u.name as agent_name, u.avatar as agent_avatar, p.name as project_name
                 FROM leads l
                 LEFT JOIN users u ON l.assigned_to = u.id
                 LEFT JOIN projects p ON l.project_id = p.id
                 WHERE ${where}
                 ORDER BY l.created_at DESC
                 LIMIT $${i} OFFSET $${i + 1}`,
                [...params, limit, offset]
            ),
            pool.query(`SELECT COUNT(*) FROM leads l WHERE ${where}`, params),
        ]);

        res.json({
            data: dataRes.rows,
            total: parseInt(countRes.rows[0].count),
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
    const allowed = ['stage', 'assigned_to', 'priority', 'score'];
    const validUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(validUpdates).length) return res.status(400).json({ error: 'No valid fields to update' });

    const setClauses = Object.keys(validUpdates).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(validUpdates);

    try {
        const { rows } = await pool.query(
            `UPDATE leads SET ${setClauses} WHERE id = ANY($1) AND tenant_id = $2 RETURNING id`,
            [leadIds, req.tenantId, ...values]
        );

        // Simple activity log for bulk action
        await pool.query(
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

        res.json({ message: 'Leads updated successfully', count: rows.length });
    } catch (err) {
        console.error('Bulk update error:', err);
        res.status(500).json({ error: 'Failed to bulk update leads' });
    }
});

// POST /api/leads/bulk-delete
router.post('/bulk-delete', async (req, res) => {
    if (!['admin', 'sales_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: 'leadIds array is required' });
    }
    try {
        const { rowCount } = await pool.query(
            `DELETE FROM leads WHERE id = ANY($1) AND tenant_id = $2`,
            [leadIds, req.tenantId]
        );
        res.json({ message: 'Leads deleted successfully', count: rowCount });
    } catch (err) {
        console.error('Bulk delete error:', err);
        res.status(500).json({ error: 'Failed to bulk delete leads' });
    }
});



// POST /api/leads
router.post('/', validateLead, async (req, res) => {
    try {
        // Plan limit enforcement
        const { rows: [tenant] } = await pool.query(`SELECT max_leads FROM tenants WHERE id=$1`, [req.tenantId]);
        const { rows: [leadCount] } = await pool.query(`SELECT COUNT(*) FROM leads WHERE tenant_id=$1`, [req.tenantId]);
        if (parseInt(leadCount.count) >= tenant.max_leads) {
            return res.status(403).json({ error: `Lead limit reached (${tenant.max_leads}). Please upgrade your plan.` });
        }

        const {
            name, phone, email, city, source, stage, priority, score,
            property_type, project_id, budget, assigned_to, notes, channel_partner_id
        } = req.body;
        // Duplicate check by phone within tenant
        const dup = await pool.query(`SELECT id FROM leads WHERE tenant_id=$1 AND phone=$2`, [req.tenantId, phone]);
        if (dup.rows.length) {
            return res.status(409).json({ error: 'A lead with this phone number already exists.', existing_id: dup.rows[0].id });
        }

        const { rows } = await pool.query(
            `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, priority, score, property_type, project_id, budget, assigned_to, notes, channel_partner_id, last_contact_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()) RETURNING *`,
            [req.tenantId, name, phone, email || null, city || null, source || 'Website', stage || 'New',
            priority || 'Medium', score || 50, property_type || null, project_id || null, budget || null,
            assigned_to || null, notes || null, channel_partner_id || null]
        );

        const newLead = rows[0];

        // Trigger Automated Workflows (Round Robin, Notifications, etc.)
        automationService.handleLeadCreate(newLead, req.io).catch(err => {
            console.error('[Automation Trigger] Error executing workflows:', err);
        });

        // Activity log
        await pool.query(
            `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, new_data)
             VALUES ($1,$2,'lead',$3,'created',$4)`,
            [req.tenantId, req.user.id, rows[0].id, JSON.stringify(rows[0])]
        );

        if (assigned_to && String(assigned_to) !== String(req.user.id)) {
            req.io.to(`user_${assigned_to}`).emit('notification', {
                title: 'New Lead Assigned',
                message: `You have been assigned a new lead: ${name}`,
                type: 'lead_assigned',
                data: rows[0]
            });
        }

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

// POST /api/leads/:id/interactions
router.post('/:id/interactions', async (req, res) => {
    const { type, date, duration, note, outcome } = req.body;
    try {
        const { rows } = await pool.query(
            `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, duration, note, outcome)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [req.tenantId, req.params.id, req.user.id, type || 'Note', date || new Date(), duration || null, note || null, outcome || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Failed to add interaction', err);
        res.status(500).json({ error: 'Failed to add interaction' });
    }
});

// PATCH /api/leads/:id
router.patch('/:id', async (req, res) => {
    const allowed = ['name', 'phone', 'email', 'city', 'source', 'stage', 'priority', 'score', 'property_type', 'project_id', 'budget', 'assigned_to', 'notes', 'last_contact_at', 'channel_partner_id'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(updates);

    try {
        // Get old data for audit log
        const old = await pool.query(`SELECT * FROM leads WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
        if (!old.rows[0]) return res.status(404).json({ error: 'Lead not found' });

        const { rows } = await pool.query(
            `UPDATE leads SET ${setClauses} WHERE id=$1 AND tenant_id=$2 RETURNING *`,
            [req.params.id, req.tenantId, ...values]
        );

        await pool.query(
            `INSERT INTO activity_log (tenant_id, user_id, entity_type, entity_id, action, old_data, new_data)
             VALUES ($1,$2,'lead',$3,'updated',$4,$5)`,
            [req.tenantId, req.user.id, req.params.id, JSON.stringify(old.rows[0]), JSON.stringify(rows[0])]
        );

        if (updates.assigned_to && String(updates.assigned_to) !== String(old.rows[0].assigned_to) && String(updates.assigned_to) !== String(req.user.id)) {
            req.io.to(`user_${updates.assigned_to}`).emit('notification', {
                title: 'Lead Reassigned',
                message: `Lead ${rows[0].name} has been reassigned to you.`,
                type: 'lead_assigned',
                data: rows[0]
            });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

// DELETE /api/leads/:id  (admin/manager only)
router.delete('/:id', async (req, res) => {
    if (!['admin', 'sales_manager'].includes(req.user.role))
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
router.post('/:id/ai-score', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM leads WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
        if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });

        const lead = rows[0];
        let score = 50;
        let reasons = [];

        // Check for Gemini API Key, fallback to simulated logic if missing
        if (!process.env.GEMINI_API_KEY) {
            console.log("GEMINI_API_KEY is not set, falling back to simulated logic");
            if (lead.phone && lead.email) { score += 15; reasons.push("Has valid phone and email"); }
            if (lead.budget && parseInt(lead.budget.replace(/[^0-9]/g, '')) > 50) { score += 20; reasons.push("High budget indication ($)"); }
            if (lead.notes && lead.notes.length > 20) { score += 10; reasons.push("Detailed notes exist indicating conversation"); }
            if (lead.source === 'Referral') { score += 15; reasons.push("Referral source carries higher conversion probability"); }
            if (lead.stage === 'Site Visit' || lead.stage === 'Negotiation') { score += 20; reasons.push(`Late pipeline stage (${lead.stage}) indicates high intent`); }
            if (lead.stage === 'Lost') { score = 10; reasons.push("Lead marked as lost"); }
            score = Math.min(Math.max(score, 10), 99); // Clamp score
        } else {
            console.log("Running Real Google Gemini AI Evaluation");
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            const prompt = `
            You are an expert Real Estate Sales AI Assistant. Your task is to evaluate the intent and quality of a lead based on their CRM data.
            Please analyze the following lead data:
            - Name: ${lead.name}
            - Email: ${lead.email || 'None'}
            - Phone: ${lead.phone || 'None'}
            - City: ${lead.city || 'None'}
            - Stage in Pipeline: ${lead.stage}
            - Source: ${lead.source}
            - Listed Budget: ${lead.budget || 'None'}
            - Property Type Requested: ${lead.property_type || 'None'}
            - Agent Notes: ${lead.notes || 'None'}
            
            Based on this information, output a JSON object containing:
            1. 'score': A number from 0 to 100 representing the lead's conversion likelihood (100 is highly likely to close).
            2. 'reasons': An array of exactly 3 to 4 short, concise bullet points explaining why you gave this score based on the data.
            
            IMPORTANT: Return ONLY valid JSON, without markdown formatting or code blocks.
            Example format: {"score": 85, "reasons": ["Good budget", "Contact info present"]}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
            });

            try {
                // Try parsing the text output, remove potential markdown code block wrappers
                let jsonText = response.text.trim();
                jsonText = jsonText.replace(/^```json/i, '').replace(/```$/i, '').trim();
                const aiResult = JSON.parse(jsonText);
                score = aiResult.score || score;
                reasons = aiResult.reasons || ["AI successfully analyzed the lead data."];
                score = Math.min(Math.max(score, 10), 99); // Clamp
            } catch (_parseError) {
                console.error("Failed to parse Gemini output:", response.text);
                score = 50;
                reasons = ["Failed to parse AI response. Using baseline score."];
            }
        }

        const updated = await pool.query(
            `UPDATE leads SET score=$1 WHERE id=$2 AND tenant_id=$3 RETURNING *`,
            [score, req.params.id, req.tenantId]
        );

        res.json({ newScore: score, reasons: reasons, lead: updated.rows[0], message: 'AI evaluation complete' });
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
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ error: 'Empty file or invalid format' });
        }

        let importedCount = 0;
        let duplicateCount = 0;
        let skippedLimit = 0;

        for (const row of rows) {
            const name = row['Name'] || row['name'];
            const phone = String(row['Phone'] || row['phone']).trim();
            const email = row['Email'] || row['email'];
            const city = row['City'] || row['city'];
            const source = row['Source'] || row['source'] || 'Import';

            if (!name || !phone) continue;

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
                `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, priority, score)
                 VALUES ($1, $2, $3, $4, $5, $6, 'New', 'Medium', 50)`,
                [req.tenantId, name, phone, email || null, city || null, source]
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
