import express, { Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../../../middleware/auth';
import pool from '../../../db/pool';
import { generateAIResponse, generateAudioTranscription, isAiEnabled } from '../../../utils/ai';
import { uploadToFirebase } from '../../../utils/cloudStorage';
import { isStorageEnabled } from '../../../utils/firebase';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/zapier/enrich-lead/:id
 */
router.post('/enrich-lead/:id', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });

        const lead = rows[0];
        const { rows: tenantRows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
        const tenantKey = tenantRows[0]?.settings?.gemini_api_key || null;

        const prompt = `
            Analyze this Real Estate Lead data and provide:
            1. Standardization suggestions (proper casing for name, valid email check).
            2. Customer Persona: Based on budget (${lead.budget}) and property type (${lead.property_type}), categorize them.
            3. Talking Points: 3 personalized ice-breakers for the sales agent.
            4. Digital Footprint Search Query: A suggested Google/LinkedIn search query.

            Lead Data:
            Name: ${lead.name}
            Email: ${lead.email}
            Budget: ${lead.budget}
            Notes: ${lead.notes}

            Return ONLY raw JSON:
            {
                "standardized": { "name": "Standardized Name", "email": "standardized@email.com" },
                "persona": "One line category",
                "talkingPoints": ["Point 1", "Point 2", "Point 3"],
                "searchQuery": "Google Search Query"
            }
        `;

        const insights = await generateAIResponse(prompt, true, tenantKey);
        res.json({ enriched: true, insights });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Zapier AI failed to enrich lead' });
    }
});

/**
 * POST /api/zapier/transcribe-call
 */
router.post('/transcribe-call', upload.single('audio'), async (req: any, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    try {
        const { rows: tenantRows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
        const tenantKey = tenantRows[0]?.settings?.gemini_api_key || null;

        if (!isAiEnabled && !tenantKey) {
            return res.json({
                transcript: [{ speaker: 'AGt', text: 'AI Assistant is currently disabled. Check system configuration.' }],
                sentiment: 'Neutral'
            });
        }

        const prompt = `
            Please listen to this audio recording of a Real Estate sales call.
            Provide a detailed verbatim transcript, identifying the speakers as "AGt" (Agent) and "CLI" (Client).
            Also provide a single word sentiment analysis (Positive, Neutral, Negative, or Concerned).
            
            Return JSON format EXACTLY like this:
            {
                "transcript": [
                    { "speaker": "AGt", "text": "Hello this is Jane..." },
                    { "speaker": "CLI", "text": "Hi Jane..." }
                ],
                "sentiment": "Positive"
            }
        `;

        let audioUrl: string | null = null;
        if (isStorageEnabled) {
            try {
                audioUrl = await uploadToFirebase(req.file.buffer, req.file.originalname, 'call-recordings');
                console.log('[ZAPIER] Audio uploaded to cloud:', audioUrl);
            } catch (cloudErr: any) {
                console.error('[ZAPIER] Cloud storage failed, continuing with local only:', cloudErr.message);
            }
        }

        const base64Audio = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'audio/wav';

        const result = await generateAudioTranscription(prompt, base64Audio, mimeType, true, tenantKey);

        const { leadId, interactionId } = req.body;
        
        const transcriptSnippet = result.transcript.map((t: any) => `${t.speaker === 'AGt' ? 'Agent' : 'Client'}: ${t.text}`).join('\n');
        let noteContent = `[Automated AI Transcript | Sentiment: ${result.sentiment}]\n\n${transcriptSnippet}`;
        
        if (audioUrl) {
            noteContent += `\n\nRecording: ${audioUrl}`;
        }

        if (interactionId) {
            await pool.query(
                `UPDATE interactions SET note = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
                [noteContent, interactionId, req.tenantId]
            );
            const updated = await pool.query(
                `SELECT i.*, l.name as lead_name, l.phone as lead_phone, u.name as agent_name
                 FROM interactions i
                 JOIN leads l ON i.lead_id = l.id
                 JOIN users u ON i.user_id = u.id
                 WHERE i.id = $1`,
                [interactionId]
            );
            return res.json({ ...result, savedInteraction: updated.rows[0] });
        } else if (leadId) {
            await pool.query(
                `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note)
                 VALUES ($1, $2, $3, 'Call', NOW(), $4)`,
                [req.tenantId, leadId, req.user.id, noteContent]
            );
            const lastLog = await pool.query(
                `SELECT i.*, l.name as lead_name, l.phone as lead_phone, u.name as agent_name
                 FROM interactions i
                 JOIN leads l ON i.lead_id = l.id
                 JOIN users u ON i.user_id = u.id
                 WHERE i.tenant_id = $1 AND i.lead_id = $2
                 ORDER BY i.date DESC LIMIT 1`, 
                [req.tenantId, leadId]
            );
            return res.json({ ...result, savedInteraction: lastLog.rows[0] });
        }

        res.json(result);
    } catch (err) {
        console.error("Audio Transcription failed:", err);
        res.status(500).json({ error: 'AI failed to transcribe audio payload' });
    }
});

/**
 * POST /api/zapier/summarize-call
 */
router.post('/summarize-call', async (req: any, res: Response) => {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    try {
        const { rows: tenantRows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
        const tenantKey = tenantRows[0]?.settings?.gemini_api_key || null;

        if (!isAiEnabled && !tenantKey) {
            return res.json({
                summary: "This is a simulated AI summary. (Gemini API Key missing)",
                keyPoints: ["Lead expressed interest in 3BHK", "Budget is slightly flexible", "Wants to visit site next Sunday"],
                sentiment: "Positive",
                actionItems: ["Book site visit for Sunday", "Send brochure for Tower B"]
            });
        }

        const prompt = `
            Analyze this Real Estate Call Transcript/Notes and provide a structured summary.
            Transcript: ${transcript}

            Return JSON:
            {
                "summary": "A 1-2 sentence overview",
                "keyPoints": ["3-4 bullet points of main discussion items"],
                "sentiment": "Positive/Neutral/Concerned",
                "actionItems": ["List of follow-up tasks"]
            }
        `;

        const result = await generateAIResponse(prompt);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI failed to summarize call' });
    }
});

/**
 * POST /api/zapier/generate-content
 */
router.post('/generate-content', async (req: any, res: Response) => {
    const { leadId, channel, tone, goal } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, req.tenantId]);
        if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });

        const lead = rows[0];
        const prompt = `
            Write a ${tone} ${channel} message for a real estate lead named ${lead.name}.
            The goal of this message is to: ${goal}.
            Recent context: ${lead.notes || 'New lead'}.
            Property of interest: ${lead.property_type || 'General enquiry'}.

            Return JSON:
            {
                "subject": "string (empty if whatsapp)",
                "body": "string",
                "tips": "string (one short advice for the sender)"
            }
        `;

        const { rows: tenantRows } = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
        const tenantKey = tenantRows[0]?.settings?.gemini_api_key || null;

        const content = await generateAIResponse(prompt, true, tenantKey);
        res.json(content);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Zapier AI failed to generate content' });
    }
});

/**
 * GET /api/zapier/smart-recommendations
 */
router.get('/smart-recommendations', async (req: any, res: Response) => {
    try {
        const leads = await pool.query(
            'SELECT name, stage, budget FROM leads WHERE assigned_to = $1 AND tenant_id = $2 AND stage NOT IN (\'Won\', \'Lost\') LIMIT 5',
            [req.user.id, req.tenantId]
        );

        const followups = await pool.query(
            'SELECT f.*, l.name as lead_name FROM followups f JOIN leads l ON f.lead_id = l.id WHERE f.assigned_to = $1 AND f.tenant_id = $2 AND f.status = \'Pending\' AND f.scheduled_at < NOW() LIMIT 3',
            [req.user.id, req.tenantId]
        );

        if (!isAiEnabled) {
            return res.json([
                { type: 'action', title: 'Follow up with ' + (leads.rows[0]?.name || 'new leads'), priority: 'High' }
            ]);
        }

        const prompt = `
            Based on this agent's task list, provide 3 to 4 "Smart Recommendations" for their day.
            Leads: ${JSON.stringify(leads.rows)}
            Overdue Followups: ${JSON.stringify(followups.rows)}

            Return JSON array of objects:
            [
              { "type": "warning|opportunity|task", "title": "string", "description": "string", "priority": "High|Medium|Low" }
            ]
        `;

        const recs = await generateAIResponse(prompt);
        res.json(recs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Zapier AI failed to fetch recommendations' });
    }
});

/**
 * POST /api/zapier/webhook
 */
router.post('/webhook', async (req: any, res: Response) => {
    const { url, data } = req.body;
    if (!url) return res.status(400).json({ error: 'Webhook URL is required' });

    // SSRF Protection
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const blockedPatterns = [
            /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
            /^192\.168\./, /^0\./, /^169\.254\./, /^fc00:/i, /^fe80:/i, /^\[::1\]$/,
        ];
        if (blockedPatterns.some(p => p.test(hostname))) {
            return res.status(400).json({ error: 'Webhook URL cannot target internal addresses' });
        }
        if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
            return res.status(400).json({ error: 'Webhook URL must use HTTPS' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid webhook URL' });
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                tenant_id: req.tenantId,
                sent_at: new Date().toISOString(),
                triggered_by: req.user.name
            }),
            signal: AbortSignal.timeout(10000),
        });

        res.json({ success: true, status: response.status });
    } catch (err: any) {
        console.error('[Zapier Webhook] Failed:', err.message);
        res.status(500).json({ error: 'Failed to trigger webhook' });
    }
});

export default router;
