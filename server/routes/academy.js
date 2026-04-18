const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(auth);

// GET /api/academy/modules — list all training modules for tenant
router.get('/modules', async (req, res) => {
    try {
        const { category, type } = req.query;
        let q = `
            SELECT m.*, 
                   u.name as uploaded_by_name,
                   p.progress, p.completed, p.completed_at
            FROM training_modules m
            LEFT JOIN users u ON m.uploaded_by = u.id
            LEFT JOIN training_progress p ON m.id = p.module_id AND p.user_id = $2
            WHERE m.tenant_id = $1 AND COALESCE(m.is_active, TRUE) = TRUE
        `;
        const params = [req.tenantId, req.user.id];
        if (category) { q += ` AND m.category = $${params.length + 1}`; params.push(category); }
        if (type) { q += ` AND m.type = $${params.length + 1}`; params.push(type); }
        
        q += ` ORDER BY m.created_at DESC`;
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err) {
        console.error('[ACADEMY] GET /modules error:', {
            error: err.message,
            stack: err.stack,
            tenantId: req.tenantId,
            userId: req.user?.id
        });
        res.status(500).json({ error: 'Failed to fetch training modules: ' + err.message });
    }
});

// POST /api/academy/upload — upload actual file + create module (Admin Only)
router.post('/upload', (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('[ACADEMY UPLOAD] Multer Error:', err);
            return res.status(400).json({ error: err.message });
        }

        try {
            // Only allow admins or superadmins to upload
            if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
                return res.status(403).json({ error: 'Only administrators can upload training materials' });
            }

            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const { title, description, category, type, xp_points, duration, instructor } = req.body;
            const fileUrl = `/uploads/${req.tenantId}/${req.file.filename}`;

            const { rows } = await pool.query(
                `INSERT INTO training_modules
                    (tenant_id, uploaded_by, title, description, category, type, file_url, file_size, mime_type, xp_points, duration, instructor)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
                [
                    req.tenantId,
                    req.user.id,
                    title || req.file.originalname,
                    description || null,
                    category || 'General',
                    type || 'Document',
                    fileUrl,
                    req.file.size,
                    req.file.mimetype,
                    parseInt(xp_points) || 100,
                    duration || '5-10m',
                    instructor || req.user.name,
                ]
            );
            res.status(201).json(rows[0]);
        } catch (dbErr) {
            console.error('POST /academy/upload DB error:', dbErr);
            res.status(500).json({ error: 'Failed to create training module record' });
        }
    });
});

// POST /api/academy/progress — update progress for a module
router.post('/progress', async (req, res) => {
    try {
        const { module_id, progress, completed } = req.body;
        if (!module_id) return res.status(400).json({ error: 'Module ID is required' });

        const completedAt = completed ? new Date() : null;

        const { rows } = await pool.query(
            `INSERT INTO training_progress (tenant_id, user_id, module_id, progress, completed, completed_at, last_accessed)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (user_id, module_id) DO UPDATE SET 
                progress = EXCLUDED.progress,
                completed = CASE WHEN EXCLUDED.completed = TRUE THEN TRUE ELSE training_progress.completed END,
                completed_at = CASE WHEN EXCLUDED.completed = TRUE AND training_progress.completed = FALSE THEN EXCLUDED.completed_at ELSE training_progress.completed_at END,
                last_accessed = NOW()
             RETURNING *`,
            [req.tenantId, req.user.id, module_id, progress || 0, completed || false, completedAt]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('POST /academy/progress error:', err);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// GET /api/academy/leaderboard — get agent leaderboard for learning
router.get('/leaderboard', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.name, u.avatar,
                    COUNT(p.id) as modules_completed,
                    SUM(m.xp_points) as total_xp
             FROM users u
             JOIN training_progress p ON u.id = p.user_id AND p.completed = TRUE
             JOIN training_modules m ON p.module_id = m.id
             WHERE u.tenant_id = $1
             GROUP BY u.id, u.name, u.avatar
             ORDER BY total_xp DESC
             LIMIT 10`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error('[ACADEMY] GET /leaderboard error:', {
            error: err.message,
            stack: err.stack,
            tenantId: req.tenantId
        });
        res.status(500).json({ error: 'Failed to fetch leaderboard: ' + err.message });
    }
});

// DELETE /api/academy/modules/:id (Admin Only)
router.delete('/modules/:id', async (req, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        const { rowCount } = await pool.query(
            'DELETE FROM training_modules WHERE id = $1 AND tenant_id = $2',
            [req.params.id, req.tenantId]
        );
        if (!rowCount) return res.status(404).json({ error: 'Module not found' });
        res.json({ message: 'Training module removed' });
    } catch (err) {
        console.error('DELETE /academy/modules error:', err);
        res.status(500).json({ error: 'Failed to delete module' });
    }
});

// --- BATTLE CARDS API ---

// GET /api/academy/battle-cards — list all battle cards for tenant
router.get('/battle-cards', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM project_battle_cards WHERE tenant_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY created_at DESC',
            [req.tenantId]
        );
        res.json(rows);
    } catch (err) {
        console.error('[ACADEMY] GET /battle-cards error:', {
            error: err.message,
            stack: err.stack,
            tenantId: req.tenantId
        });
        res.status(500).json({ error: 'Failed to fetch battle cards: ' + err.message });
    }
});

// POST /api/academy/battle-cards — create new battle card (Admin Only)
router.post('/battle-cards', async (req, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        const { project_name, usp, objections, target_audience } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO project_battle_cards (tenant_id, project_name, usp, objections, target_audience)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.tenantId, project_name, usp || [], JSON.stringify(objections || []), target_audience || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /academy/battle-cards error:', err);
        res.status(500).json({ error: 'Failed to create battle card' });
    }
});

// PUT /api/academy/battle-cards/:id (Admin Only)
router.put('/battle-cards/:id', async (req, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        const { project_name, usp, objections, target_audience } = req.body;
        const { rows } = await pool.query(
            `UPDATE project_battle_cards 
             SET project_name = $1, usp = $2, objections = $3, target_audience = $4, updated_at = NOW()
             WHERE id = $5 AND tenant_id = $6 RETURNING *`,
            [project_name, usp, JSON.stringify(objections), target_audience, req.params.id, req.tenantId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Battle card not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /academy/battle-cards error:', err);
        res.status(500).json({ error: 'Failed to update battle card' });
    }
});

// DELETE /api/academy/battle-cards/:id (Admin Only)
router.delete('/battle-cards/:id', async (req, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        const { rowCount } = await pool.query(
            'DELETE FROM project_battle_cards WHERE id = $1 AND tenant_id = $2',
            [req.params.id, req.tenantId]
        );
        if (!rowCount) return res.status(404).json({ error: 'Battle card not found' });
        res.json({ message: 'Battle card removed' });
    } catch (err) {
        console.error('DELETE /academy/battle-cards error:', err);
        res.status(500).json({ error: 'Failed to delete battle card' });
    }
});

const { generateAIResponse } = require('../utils/ai');

// ... [existing routes] ...

/**
 * POST /api/academy/simulate — Dynamic AI response for ZenZone
 */
router.post('/simulate', async (req, res) => {
    const { message, history, persona, language, context } = req.body;

    try {
        const conversationHistory = history.map(h => 
            `${h.type === 'bot' ? 'Prospect' : 'Agent'}: ${h.text}`
        ).join('\n');

        const prompt = `
            You are currently acting as an AI Persona for a REAL ESTATE SALES SIMULATOR.
            
            ACTUAL PERSONA: ${persona}
            TARGET LANGUAGE: ${language}
            CONTEXT: ${context || 'General Real Estate Discovery'}

            CONVERSATION HISTORY:
            ${conversationHistory}

            AGENT'S LAST INPUT: "${message}"

            INSTRUCTIONS:
            1. Respond as the specified persona ${persona}.
            2. Language Style: ${language}. If Hinglish, use a mix of Hindi and English. If Hindi, use pure Hindi but professional.
            3. Sentiment: Be a "difficult client". Ask tough objections about ROI, hidden costs, construction quality, or location flaws.
            4. Keep responses concise (under 40 words) as it is a simulated mobile chat.
            5. Do NOT break character.

            OUTPUT: Return ONLY the raw response text from the prospect.
        `;

        const aiResponse = await generateAIResponse(prompt, false);
        res.json({ text: aiResponse.trim() });

    } catch (err) {
        console.error('[Academy Simulator Error]:', err);
        res.status(500).json({ error: 'AI Simulator failed to respond.' });
    }
});

module.exports = router;
