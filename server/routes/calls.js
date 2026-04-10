const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/calls/stats — Voice Telemetry
router.get('/stats', async (req, res) => {
    const tid = req.tenantId;
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_calls,
                AVG(duration) as avg_duration,
                COUNT(*) FILTER (WHERE outcome = 'Connected') as success_calls,
                COUNT(*) FILTER (WHERE outcome = 'Busy' OR outcome = 'No Answer') as failed_calls
            FROM interactions 
            WHERE tenant_id = $1 AND type = 'Call'
        `, [tid]);

        const hourlyDist = await pool.query(`
            SELECT EXTRACT(HOUR FROM date) as hour, COUNT(*) as count
            FROM interactions
            WHERE tenant_id = $1 AND type = 'Call'
            GROUP BY hour
            ORDER BY hour
        `, [tid]);

        res.json({
            summary: stats.rows[0],
            hourly: hourlyDist.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load call telemetry' });
    }
});

// POST /api/calls/initiate — SIM-Bridge Initiation
router.post('/initiate', async (req, res) => {
    const { leadId, phoneNumber, method } = req.body;
    const tid = req.tenantId;
    const uid = req.userId;

    try {
        // Find lead
        const lead = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, tid]);
        if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

        // In a real GSM-integrated build, we would send a Socket event 
        // to a Mobile App or a GSM Gateway device connected to this tenant.
        if (req.io && method !== 'SIP') {
            req.io.to(`user_${uid}`).emit('dialer_command', {
                command: 'START_GSM_CALL',
                phoneNumber: phoneNumber || lead.rows[0].phone,
                leadName: lead.rows[0].name,
                leadId: leadId
            });
        }

        // Create a pending interaction record
        const interaction = await pool.query(`
            INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, outcome, note)
            VALUES ($1, $2, $3, 'Call', NOW(), 'Calling...', $4)
            RETURNING *
        `, [tid, leadId, uid, method === 'SIP' ? 'Outgoing WebRTC Call via Asterisk' : 'Outgoing GSM Call via Integrated SIM']);

        res.json({ success: true, interactionId: interaction.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initiate dialer' });
    }
});

const aiService = require('../services/aiService');

// PATCH /api/calls/:id — End call / update telemetry
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { duration, outcome, note, recordingUrl } = req.body;
    const tid = req.tenantId;

    try {
        // 1. Check if the telephony route already enriched this interaction
        const existing = await pool.query(
            'SELECT note, recording_url, transcript FROM interactions WHERE id = $1 AND tenant_id = $2',
            [id, tid]
        );

        if (existing.rows.length === 0) return res.status(404).json({ error: 'Call record not found' });

        const existingRow = existing.rows[0];
        const hasAiContent = existingRow.note && existingRow.note.includes('[Automated AI Transcript');
        
        // Don't overwrite AI-enriched notes with generic "GSM Call completed" 
        const finalNote = hasAiContent ? existingRow.note : (note || existingRow.note);
        const finalRecordingUrl = recordingUrl || existingRow.recording_url;

        // 2. Update with merged data
        const { rows } = await pool.query(`
            UPDATE interactions 
            SET duration = COALESCE($1, duration), outcome = $2, note = $3, 
                recording_url = COALESCE($4, recording_url), updated_at = NOW()
            WHERE id = $5 AND tenant_id = $6
            RETURNING *
        `, [duration, outcome, finalNote, finalRecordingUrl, id, tid]);

        // 3. Trigger AI Transcription (Background) — only if we have a URL and no transcript yet
        if (finalRecordingUrl && !existingRow.transcript) {
            console.log(`[Calls] Triggering AI Transcription for Interaction: ${id}`);
            // We do NOT await this so the response is fast
            aiService.transcribeCall(finalRecordingUrl).then(async (result) => {
                await pool.query(`
                    UPDATE interactions 
                    SET transcript = $1, sentiment = $2, 
                        rapport_score = $3, closing_score = $4, ai_skills = $5,
                        projects_discussed = $7,
                        updated_at = NOW()
                    WHERE id = $6
                    RETURNING lead_id, user_id, tenant_id
                `, [result.fullAnalysis, result.sentiment, result.rapportScore, result.closingScore, result.skills, id, result.projectsDiscussed]).then(async (upd) => {
                    const row = upd.rows[0];
                    if (row && result.smartTasks?.length > 0) {
                        for (const task of result.smartTasks) {
                            await pool.query(`
                                INSERT INTO followups (tenant_id, lead_id, assigned_to, type, status, note, scheduled_at, priority, is_ai_generated)
                                VALUES ($1, $2, $3, 'Task', 'Pending', $4, NOW() + INTERVAL '1 day', 'High', TRUE)
                            `, [row.tenant_id, row.lead_id, row.user_id, task.description]);
                        }
                        console.log(`[Calls] ${result.smartTasks.length} AI Smart Tasks generated for Interaction: ${id}`);
                    }
                });
                console.log(`[Calls] AI Coaching Audit persisted for Interaction: ${id}`);
            }).catch(err => {
                console.error(`[Calls] AI Background Task Failed:`, err);
            });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update call record' });
    }
});

module.exports = router;
