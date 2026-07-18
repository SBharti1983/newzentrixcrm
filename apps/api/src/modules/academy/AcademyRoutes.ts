import express, { Request, Response, NextFunction } from 'express';
import pool from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';
import AcademyCoachingService from '../academy/AcademyCoachingService';
import upload from '../../middleware/upload';
import { generateAIResponse, generateAudioTranscription } from '../../utils/ai';
import fs from 'fs/promises';

const router = express.Router();
router.use(authenticateToken);

// GET /api/academy/modules — list all training modules for tenant
router.get('/modules', async (req: any, res: Response) => {
    try {
        const { category, type } = req.query;
        let q = `
            SELECT m.*, 
                   u.name as uploaded_by_name,
                   p.progress, p.completed, p.completed_at, p.is_certified, p.best_score
            FROM training_modules m
            LEFT JOIN users u ON m.uploaded_by = u.id
            LEFT JOIN training_progress p ON m.id = p.module_id AND p.user_id = $2
            WHERE m.tenant_id = $1 AND COALESCE(m.is_active, TRUE) = TRUE
        `;
        const params: any[] = [req.tenantId, req.user.id];
        if (category) { q += ` AND m.category = $${params.length + 1}`; params.push(category); }
        if (type) { q += ` AND m.type = $${params.length + 1}`; params.push(type); }
        
        q += ` ORDER BY m.created_at DESC`;
        const { rows } = await pool.query(q, params);
        res.json(rows);
    } catch (err: any) {
        console.error('CRITICAL [ACADEMY] GET /modules error:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            stack: err.stack,
            tenantId: req.tenantId,
            userId: req.user?.id
        });
        res.status(500).json({ 
            error: 'Failed to fetch training modules',
            details: err.message,
            code: err.code 
        });
    }
});

// POST /api/academy/upload — upload actual file + create module (Admin Only)
router.post('/upload', (req: any, res: Response, next: NextFunction) => {
    (upload as any).single('file')(req, res, async (err: any) => {
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
router.post('/progress', async (req: any, res: Response) => {
    try {
        const { module_id, progress, completed, score } = req.body;
        if (!module_id) return res.status(400).json({ error: 'Module ID is required' });

        const completedAt = completed ? new Date() : null;
        const isCertified = score >= 85; 

        const { rows } = await pool.query(
            `INSERT INTO training_progress (tenant_id, user_id, module_id, progress, completed, completed_at, last_accessed, best_score, is_certified, certified_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
             ON CONFLICT (tenant_id, user_id, module_id) DO UPDATE SET
                progress = GREATEST(training_progress.progress, EXCLUDED.progress),
                completed = CASE WHEN EXCLUDED.completed = TRUE THEN TRUE ELSE training_progress.completed END,
                completed_at = CASE WHEN EXCLUDED.completed = TRUE AND training_progress.completed = FALSE THEN EXCLUDED.completed_at ELSE training_progress.completed_at END,
                best_score = GREATEST(training_progress.best_score, COALESCE(EXCLUDED.best_score, 0)),
                is_certified = CASE WHEN EXCLUDED.is_certified = TRUE THEN TRUE ELSE training_progress.is_certified END,
                certified_at = CASE WHEN EXCLUDED.is_certified = TRUE AND training_progress.is_certified = FALSE THEN EXCLUDED.certified_at ELSE training_progress.certified_at END,
                last_accessed = NOW()
             RETURNING *`,
            [req.tenantId, req.user.id, module_id, progress || 0, completed || false, completedAt, score || 0, isCertified, isCertified ? new Date() : null]
        );

        // --- XP & LEVELING ENGINE ---
        if (completed && module_id) {
            const { rows: modRows } = await pool.query('SELECT xp_points FROM training_modules WHERE id = $1', [module_id]);
            const xpToAdd = modRows[0]?.xp_points || 50;
            
            await pool.query(`
                UPDATE users 
                SET xp = xp + $1,
                    level = floor(sqrt(xp + $1) / 10) + 1,
                    rank_title = CASE 
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 20 THEN 'Legendary Closer'
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 15 THEN 'Deal Master'
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 10 THEN 'Negotiation Ninja'
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 5 THEN 'Lead Hunter'
                        ELSE 'Novice Closer'
                    END
                WHERE id = $2 AND tenant_id = $3
            `, [xpToAdd, req.user.id, req.tenantId]);
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('POST /academy/progress error:', err);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

/**
 * POST /api/academy/coaching/audit
 * Trigger an automated performance-based coaching audit
 */
router.post('/coaching/audit', async (req: any, res: Response) => {
    const { tenantId, role } = req.user;
    if (role !== 'admin' && role !== 'manager') {
        return res.status(403).json({ error: 'Only admins or managers can trigger coaching audits' });
    }

    try {
        const result = await AcademyCoachingService.runPerformanceAudit(tenantId);
        res.json({ message: 'Performance audit completed successfully', ...result });
    } catch (err) {
        res.status(500).json({ error: 'Coaching audit failed' });
    }
});

/**
 * GET /api/academy/stats/management — Management insights (Admin Only)
 */
router.get('/stats/management', async (req: any, res: Response) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const stats: any = {};

        // 1. Module Readiness (% items certified)
        const { rows: moduleStats } = await pool.query(
            `SELECT m.title, 
                    COUNT(p.id) filter (where p.is_certified = TRUE) as certified_count,
                    COUNT(p.id) as total_attempts,
                    AVG(p.best_score) as avg_score
             FROM training_modules m
             LEFT JOIN training_progress p ON m.id = p.module_id
             WHERE m.tenant_id = $1
             GROUP BY m.id, m.title`,
            [req.tenantId]
        );
        stats.moduleReadiness = moduleStats;

        // 2. Top Performers
        const { rows: performers } = await pool.query(
            `SELECT u.name, COUNT(p.id) as cert_count
             FROM users u
             JOIN training_progress p ON u.id = p.user_id
             WHERE u.tenant_id = $1 AND p.is_certified = TRUE
             GROUP BY u.id, u.name
             ORDER BY cert_count DESC LIMIT 5`,
            [req.tenantId]
        );
        stats.topPerformers = performers;

        res.json(stats);
    } catch (err) {
        console.error('GET /stats/management error:', err);
        res.status(500).json({ error: 'Failed to fetch management stats' });
    }
});

// GET /api/academy/leaderboard — get agent leaderboard for learning
router.get('/leaderboard', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, avatar, xp, level, rank_title
             FROM users 
             WHERE tenant_id = $1 AND is_active = TRUE
             ORDER BY xp DESC
             LIMIT 10`,
            [req.tenantId]
        );
        res.json(rows);
    } catch (err: any) {
        console.error('[ACADEMY] GET /leaderboard error:', {
            error: err.message,
            stack: err.stack,
            tenantId: req.tenantId
        });
        res.status(500).json({ error: 'Failed to fetch leaderboard: ' + err.message });
    }
});

// DELETE /api/academy/modules/:id (Admin Only)
router.delete('/modules/:id', async (req: any, res: Response) => {
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
router.get('/battle-cards', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM project_battle_cards WHERE tenant_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY created_at DESC',
            [req.tenantId]
        );
        res.json(rows);
    } catch (err: any) {
        console.error('[ACADEMY] GET /battle-cards error:', {
            error: err.message,
            stack: err.stack,
            tenantId: req.tenantId
        });
        res.status(500).json({ error: 'Failed to fetch battle cards: ' + err.message });
    }
});

// POST /api/academy/battle-cards — create new battle card (Admin Only)
router.post('/battle-cards', async (req: any, res: Response) => {
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
router.put('/battle-cards/:id', async (req: any, res: Response) => {
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
router.delete('/battle-cards/:id', async (req: any, res: Response) => {
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

/**
 * POST /api/academy/battle-cards/generate — Auto-generate Battle Card from Module
 */
router.post('/battle-cards/generate', async (req: any, res: Response) => {
    const { title, description } = req.body;

    try {
        const prompt = `
            You are a Sales Strategy Expert. 
            Create a Project Battle Card based on this training module info:
            TITLE: ${title}
            DESCRIPTION: ${description}

            Return a VALID JSON object:
            {
                "project_name": "string",
                "usp": ["string", "string", "string"],
                "objections": [
                    {"q": "Objection 1", "a": "Winning Response 1"},
                    {"q": "Objection 2", "a": "Winning Response 2"}
                ],
                "target_audience": "string"
            }

            Focus on high-impact hooks and objection handling.
        `;

        const cardData = await generateAIResponse(prompt, true);
        res.json(cardData);

    } catch (err) {
        console.error('[Battle Card Generation Error]:', err);
        res.status(500).json({ error: 'Failed to auto-generate battle card.' });
    }
});

/**
 * POST /api/academy/simulate — Dynamic AI response for ZenZone
 */
router.post('/simulate', async (req: any, res: Response) => {
    let { message, history, persona, language, context, audio, mimeType } = req.body;

    try {
        // If audio is provided, transcribe it first using our audio utility
        if (audio) {
            const transcriptionPrompt = `Identify the text of this sales agent's response in ${language}. Return ONLY the transcribed text.`;
            message = await generateAudioTranscription(transcriptionPrompt, audio, mimeType || 'audio/webm', false);
            console.log('[Sim Audio-Bypass] Transcribed:', message);
        }

        if (!message) {
            return res.status(400).json({ error: 'No message or audio provided' });
        }

        const conversationHistory = history.map((h: any) => 
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
            2. Language Style: ${language}. Use a NATURAL INDIAN ACCENT TONE (use "Ji", "Sir/Ma'am", or professional Hinglish colloquialisms if ${language} is Hinglish).
            3. Sentiment: Be a "difficult client". Ask tough objections about ROI, hidden costs, construction quality, location flaws, or family approvals (very common in India).
            4. Tone: If ${language} is English, use Indian English style (e.g., "I'm looking for a solid investment," "What is the appreciation potential?").
            5. Keep responses concise (under 40 words) as it is a simulated mobile chat.
            6. Do NOT break character.

            OUTPUT: Return ONLY the raw response text from the prospect.
        `;

        const aiResponse = (await generateAIResponse(prompt, false)) as string;
        res.json({ text: aiResponse.trim(), transcribed: audio ? message : null });

    } catch (err: any) {
        console.error('[Academy Simulator Error]:', err);
        res.status(500).json({ error: 'AI Simulator failed to respond. ' + err.message });
    }
});

/**
 * POST /api/academy/analyze — AI Feedback/Report Card for Simulation
 */
router.post('/analyze', async (req: any, res: Response) => {
    const { transcript, persona, scenario } = req.body;

    try {
        const fullTranscript = transcript.map((t: any) => `${t.type === 'bot' ? 'Prospect' : 'Agent'}: ${t.text}`).join('\n');

        const analysisPrompt = `
            You are a WORLD-CLASS SALES COACH. 
            Analyze the following transcript between a Sales Agent and a ${persona} (Scenario: ${scenario}).

            TRANSCRIPT:
            ${fullTranscript}

            Provide a structured analysis in JSON format:
            {
                "overallGrade": "A+ to F",
                "score": 0-100,
                "strengths": ["string"],
                "weaknesses": ["string"],
                "vocalConfidence": "Evaluation of confidence and professional tone extracted from linguistics",
                "objectionHandling": "Detailed feedback on how they handled challenges",
                "advice": "One critical tip for their real meeting",
                "conversationFlow": "Analysis of the 'back-and-forth' and natural improvisation quality"
            }

            Be constructive but very honest. If the agent was weak, tell them.
            Return ONLY the raw JSON string.
        `;

        const report = (await generateAIResponse(analysisPrompt, true)) as any;
        
        // --- GAME-PLAY REWARDS (Simulation XP) ---
        if (report && typeof report.score === 'number') {
            const xpEarned = Math.round(report.score * 2.5); // Score of 80 = 200 XP
            
            const { rows: userUpdate } = await pool.query(`
                UPDATE users 
                SET xp = xp + $1,
                    level = floor(sqrt(xp + $1) / 10) + 1,
                    rank_title = CASE 
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 20 THEN 'Legendary Closer'
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 15 THEN 'Deal Master'
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 10 THEN 'Negotiation Ninja'
                        WHEN floor(sqrt(xp + $1) / 10) + 1 >= 5 THEN 'Lead Hunter'
                        ELSE 'Novice Closer'
                    END
                WHERE id = $2 AND tenant_id = $3
                RETURNING xp, level, rank_title
            `, [xpEarned, req.user.id, req.tenantId]);

            report.xpEarned = xpEarned;
            report.newLevel = userUpdate[0]?.level;
            report.newRank = userUpdate[0]?.rank_title;
        }

        res.json(report);

    } catch (err) {
        console.error('[Academy Analysis Error]:', err);
        res.status(500).json({ error: 'Failed to generate AI report card.' });
    }
});

/**
 * POST /api/academy/generate-pitch — Create follows-up from simulation transcript
 */
router.post('/generate-pitch', async (req: any, res: Response) => {
    const { transcript, persona } = req.body;

    try {
        const fullTranscript = transcript.map((t: any) => `${t.type === 'bot' ? 'Prospect' : 'Agent'}: ${t.text}`).join('\n');

        const prompt = `
            TRANSCRIPT:
            ${fullTranscript}

            Based on this conversation with a ${persona}, craft a professional and persuasive WhatsApp follow-up message.
            Focus on the pain points discussed. Keep it concise, friendly, and include a clear call to action.
            Format: High-impact text only.
        `;

        const response = (await generateAIResponse(prompt, false)) as string;
        res.json({ draft: response.trim() });

    } catch (err) {
        console.error('[Pitch Generation Error]:', err);
        res.status(500).json({ error: 'Failed to generate follow-up draft.' });
    }
});

/**
 * POST /api/academy/battle/init — Get a secret mission for the Buyer in a 2-agent battle
 */
router.post('/battle/init', async (req: any, res: Response) => {
    const { scenarioId } = req.body;
    try {
        const prompt = `
            Create a "Secret Mission" for a buyer persona in a sales roleplay (Scenario ID: ${scenarioId}).
            Include:
            1. Their secret motive (e.g., they really want the property but only have 90% of the budget).
            2. A specific objection they MUST stick to.
            3. A personality trait (e.g., very impatient, very detailed).
            
            Return in 3 bullet points. No conversational filler.
        `;
        const mission = (await generateAIResponse(prompt, false)) as string;
        res.json({ mission: mission.trim() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate mission' });
    }
});

/**
 * POST /api/academy/battle/judge — Adjudicate a 2-agent battle
 */
router.post('/battle/judge', async (req: any, res: Response) => {
    const { transcript, scenarioId, sellerName, buyerName } = req.body;

    try {
        const fullTranscript = transcript.map((t: any) => `${t.sender}: ${t.text}`).join('\n');

        const judgePrompt = `
            You are a TOUGH SALES JUDGE for a Real Estate high-performers competition.
            Two agents just finished a roleplay battle.
            Seller: ${sellerName}
            Buyer: ${buyerName} (with secret motive)

            TRANSCRIPT:
            ${fullTranscript}

            Evaluate both and declare a winner.
            Return in JSON format:
            {
                "winner": "Name of the winner",
                "victoryReason": "Why they won specifically",
                "sellerFeedback": "Direct feedback for the seller",
                "buyerFeedback": "Direct feedback for the buyer",
                "closingProbability": "%"
            }
        `;

        const adjudication = await generateAIResponse(judgePrompt, true);
        res.json(adjudication);

    } catch (err) {
        console.error('[Battle Judge Error]:', err);
        res.status(500).json({ error: 'Failed to adjudicate battle' });
    }
});

/**
 * POST /api/academy/simulate/lead-init — Synthesize a persona from a REAL Lead
 */
router.post('/simulate/lead-init', async (req: any, res: Response) => {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'Lead ID is required' });

    try {
        // Fetch lead details and interactions
        const { rows: leads } = await pool.query(
            `SELECT l.*, 
                    p.name as project_name,
                    (SELECT json_agg(i) FROM (SELECT type, date, note, outcome FROM interactions WHERE lead_id = l.id ORDER BY date DESC LIMIT 10) i) as interactions
             FROM leads l
             LEFT JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND l.tenant_id = $2`,
            [leadId, req.tenantId]
        );

        if (!leads[0]) return res.status(404).json({ error: 'Lead not found' });
        const lead = leads[0];

        // Construct a prompt for AI to synthesize the persona
        const prompt = `
            You are a Sales Strategist. Based on this CRM data, synthesize a high-fidelity "AI Persona" for a sales simulation.
            
            LEAD DATA:
            Name: ${lead.name}
            Stage: ${lead.stage}
            Priority: ${lead.priority}
            Budget: ${lead.budget}
            Interest: ${lead.project_name || lead.property_type || 'Unknown'}
            Notes: ${lead.notes}
            
            HISTORY:
            ${JSON.stringify(lead.interactions || [])}

            Return a VALID JSON object:
            {
                "persona": "Detailed name/title (e.g., Mr. Khanna - Skeptical Investor)",
                "focus": "Main pain point or interest (e.g., Hidden maintenance costs)",
                "goal": "Specific mission for the agent (e.g., Close the site visit)",
                "difficulty": "Easy|Medium|Hard",
                "avatar": "humanoid avatar path or description",
                "initialGreeting": "The first thing the lead will say when the agent calls for this 'mock test'."
            }

            Make the initialGreeting reflect the Lead's current state (e.g., if they are in 'Contacted' stage, they might be waiting for a brochure).
        `;

        const synthesis = (await generateAIResponse(prompt, true)) as any;
        
        res.json({
            ...synthesis,
            leadName: lead.name,
            leadId: lead.id
        });

    } catch (err) {
        console.error('[Sim Lead Init Error]:', err);
        res.status(500).json({ error: 'Failed to synthesize persona from lead data.' });
    }
});

/**
 * POST /api/academy/calibrate — Performance Calibration from Agent Voice Sample
 */
router.post('/calibrate', (req: any, res: Response, next: NextFunction) => {
    (upload as any).single('audio')(req, res, async (err: any) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No audio sample found' });

        try {
            const { archetype } = req.body;
            const audioData = await fs.readFile(req.file.path);
            const base64Audio = audioData.toString('base64');
            const mimeType = req.file.mimetype || 'audio/webm';

            const prompt = `
                Analyze this 30-second sales pitch from a ${archetype} sales agent.
                Evaluate their:
                1. Energy: Vocal enthusiasm and drive.
                2. Velocity: Speaking speed and rhythm.
                3. Empathy: Emotional resonance in their tone.
                4. Clarity: Professional articulation.

                Return a structured analysis in JSON format:
                {
                    "overallGrade": "A-F",
                    "score": 0-100,
                    "metrics": {
                        "energy": 0-100,
                        "velocity": 0-100,
                        "empathy": 0-100,
                        "clarity": 0-100
                    },
                    "strengths": ["string"],
                    "weaknesses": ["string"],
                    "advice": "Specific tip to improve their vocal persona for this archetype",
                    "vocalConfidence": "Evaluation of their stance"
                }
                Return ONLY raw JSON.
            `;

            const analysis = await generateAudioTranscription(prompt, base64Audio, mimeType, true);
            
            // Cleanup: delete temp file
            try { await fs.unlink(req.file.path); } catch (e) {}
            
            res.json(analysis);

        } catch (err) {
            console.error('[Academy Calibration Error]:', err);
            // Cleanup: delete temp file on error
            try { if (req.file) await fs.unlink(req.file.path); } catch (e) {}
            res.status(500).json({ error: 'AI Calibration failed to process sample.' });
        }
    });
});

export default router;
