const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const pool = require('../db/pool');
const { generateAudioTranscription, transcribeFromUrl, isAiEnabled } = require('../utils/ai');
const { uploadToFirebase } = require('../utils/cloudStorage');
const { isStorageEnabled } = require('../utils/firebase');
const crypto = require('crypto');

/**
 * Hybrid auth middleware: accepts EITHER a standard JWT Bearer token (web dashboard)
 * OR the X-Zapier-Token handset auth. This lets routes like transcript, bridge-config,
 * analytics etc. work for both logged-in users and Android handsets.
 */
function hybridAuth(req, res, next) {
    const hasBearer = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
    const hasHandsetToken = req.headers['x-zapier-token'] || req.query.token;

    if (hasBearer) {
        return auth(req, res, next);
    } else if (hasHandsetToken) {
        return authenticateHandset(req, res, next);
    } else {
        return res.status(401).json({ error: 'Unauthorized: No credentials provided' });
    }
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for longer calls
});

router.use((req, res, next) => {
    console.log(`[Telephony Router] ${req.method} ${req.path}`);
    next();
});

// Specialized middleware for Android WTI app authentication via X-Zapier-Token
async function authenticateHandset(req, res, next) {
    const token = req.headers['x-zapier-token'] || req.query.token;
    if (!token) {
        console.log('[Telephony] Auth failed: No token provided');
        return res.status(401).json({ error: 'Unauthorized: No token' });
    }

    const [secret, tenantId] = token.split(':');
    if (!secret || !tenantId) {
        console.log('[Telephony] Auth failed: Invalid token format');
        return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }

    try {
        const tenantRes = await pool.query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
        if (tenantRes.rows.length === 0) {
            console.log(`[Telephony] Auth failed: Tenant ${tenantId} not found`);
            return res.status(401).json({ error: 'Unauthorized: Tenant not found' });
        }

        const settings = tenantRes.rows[0].settings || {};
        const dbSecret = settings.telephony_secret;
        
        if (!dbSecret || dbSecret !== secret) {
            console.log(`[Telephony] Auth failed: Secret mismatch for Tenant ${tenantId}`);
            return res.status(401).json({ error: 'Unauthorized: Invalid secret' });
        }

        req.tenantId = tenantId;
        req.isHandset = true;
        // Default mock user for database consistency
        req.user = req.user || { id: null, name: 'GSM Handset' };
        next();
    } catch (err) {
        console.error('[Telephony] Auth system error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/telephony/health
 * Health check endpoint for Android WTI app to verify connectivity.
 */
router.get('/health', authenticateHandset, (req, res) => {
    res.json({ status: 'ok', service: 'zentrix-telephony', storageEnabled: isStorageEnabled, aiEnabled: isAiEnabled, tenant: req.tenantId });
});

/**
 * POST /api/telephony/upload-recording
 * Specialized endpoint for Android GSM Bridge to upload call recordings and trigger transcription.
 * The Android SyncWorker sends either:
 *   - An audio file (legacy/fallback mode)
 *   - A recordingUrl from Firebase Storage (preferred, much faster)
 * Along with: interactionId, disposition, phoneNumber, timestamp
 */
router.post('/upload-recording', authenticateHandset, upload.single('audio'), async (req, res) => {
    // Support both camelCase and snake_case for handset compatibility
    const interactionId = req.body.interactionId || req.body.interaction_id;
    const leadId = req.body.leadId || req.body.lead_id;
    const disposition = req.body.disposition || req.body.outcome;
    const phoneNumber = req.body.phoneNumber || req.body.phone_number;
    const timestamp = req.body.timestamp;
    const recordingUrl = req.body.recordingUrl || req.body.recording_url;
    const duration = req.body.duration || req.body.call_duration || req.body.dur;
    const callType = req.body.callType || req.body.call_type;

    console.log(`[Telephony] ──── INCOMING UPLOAD ────`);
    console.log(`[Telephony]   Tenant: ${req.tenantId}`);
    console.log(`[Telephony]   Interaction ID: ${interactionId || 'None'}`);
    console.log(`[Telephony]   Phone: ${phoneNumber || 'Unknown'}`);
    console.log(`[Telephony]   Disposition: ${disposition || 'None'}`);
    console.log(`[Telephony]   Duration: ${duration || 'Unknown'}s`);
    console.log(`[Telephony]   Call Type: ${callType || 'Unknown'}`);
    console.log(`[Telephony]   Firebase URL: ${recordingUrl || 'None (file upload mode)'}`);
    console.log(`[Telephony]   File: ${req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE'}`);

    // Acceptance logic: We prefer a file or URL, but we permit call-logs-only if storage failed
    if (!req.file && !recordingUrl) {
        console.warn('[Telephony] Syncing call log only (no recording data provided by handset)');
    }

    try {
        // --- FETCH TENANT CONFIG ---
        const tenantRes = await pool.query("SELECT settings FROM tenants WHERE id = $1", [req.tenantId]);
        const tenantSettings = tenantRes.rows[0]?.settings || {};
        const tenantGeminiKey = tenantSettings.gemini_api_key || null;

        // --- AUTO-RESOLVE LEAD IF MISSING ---
        let finalLeadId = leadId;
        let leadPhone = phoneNumber || '0000';

        if (!finalLeadId && phoneNumber) {
            console.log(`[Telephony] No Lead ID provided. Attempting lookup for phone: ${phoneNumber}`);
            const lookupRes = await pool.query('SELECT id, name FROM leads WHERE tenant_id = $1 AND (phone = $2 OR phone LIKE $3)', 
                [req.tenantId, phoneNumber, `%${phoneNumber.slice(-10)}%`]);
            if (lookupRes.rows[0]) {
                finalLeadId = lookupRes.rows[0].id;
                console.log(`[Telephony] Found matching lead: ${lookupRes.rows[0].name} (${finalLeadId})`);
            }
        }

        console.log(`[Telephony] Processing recording for Interaction: ${interactionId || 'New'} | Lead: ${finalLeadId || 'Unknown'}`);

        let audioUrl = null;
        let leadName = 'UnknownLead';
        if (finalLeadId) {
            const leadRes = await pool.query('SELECT name FROM leads WHERE id = $1', [finalLeadId]);
            if (leadRes.rows[0]) leadName = leadRes.rows[0].name.replace(/[^a-zA-Z0-9]/g, '');
        }

        if (req.file) {
            console.log(`[Telephony] Direct file received (${req.file.buffer.length} bytes). Saving to local server...`);
            try {
                const fs = require('fs');
                const path = require('path');
                const localFolder = path.join(__dirname, '..', 'uploads', req.tenantId || 'default');
                if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder, { recursive: true });
                
                const localFileName = `${Date.now()}-${req.file.originalname}`;
                const localPath = path.join(localFolder, localFileName);
                fs.writeFileSync(localPath, req.file.buffer);
                
                const baseUrl = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5050';
                audioUrl = `${baseUrl}/uploads/${req.tenantId || 'default'}/${localFileName}`;
                console.log(`[Telephony] Local storage successful: ${audioUrl}`);

                // Secondary attempt: Firebase (only if enabled)
                if (isStorageEnabled) {
                    try {
                        let tenantSlug = 'general';
                        const tenantRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [req.tenantId]);
                        if (tenantRes.rows[0]) tenantSlug = tenantRes.rows[0].slug;

                        const agentNameStr = (req.user?.name || 'Handset').replace(/[^a-zA-Z0-9]/g, '');
                        const phoneLast4 = leadPhone.length >= 4 ? leadPhone.slice(-4) : leadPhone;
                        const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
                        const customFileName = `${leadName}_${agentNameStr}_${phoneLast4}_${timeStr}`;

                        const firebaseURL = await uploadToFirebase(req.file.buffer, req.file.originalname, `recordings/${tenantSlug}`, customFileName);
                        audioUrl = firebaseURL; // Upgrade to Firebase URL if successful
                        console.log('[Telephony] Optional Firebase backup successful.');
                    } catch (fbErr) {
                        console.warn('[Telephony] Firebase backup skipped (Spark quota or 404), using Local URL.');
                    }
                }
            } catch (err) {
                console.error('[Telephony] CRITICAL STORAGE FAILURE:', err.message);
            }
        } else if (recordingUrl) {
            audioUrl = recordingUrl;
            console.log(`[Telephony] Using pre-uploaded Firebase Storage URL: ${audioUrl}`);
        }

        let aiResult = { transcript: [], sentiment: 'Neutral', call_summary: 'No speech detected' };
        if (isAiEnabled && req.file) {
            const prompt = `
                CRITICAL INSTRUCTION: You are an expert audio analyst. 
                1. Transcribe the conversation in this Android GSM recording. The speakers may be speaking in English, Hindi, or a mix of both (Hinglish). Please translate the final transcript to English.
                2. Be extremely sensitive to low volume, compressed audio, or background noise. DO NOT dismiss the audio as silent if there is static or muffled speaking.
                3. If there is ANY speech, capture it in the "transcript" array.
                4. Provide a "call_summary" capturing the main points.
                5. Provide a "whatsapp_followup" message.
                6. If the audio is 100% dead silence, set call_summary to "No speech detected" and transcript to [].

                Return ONLY raw JSON with keys: transcript, sentiment, whatsapp_followup, call_summary.
            `;
            const base64Audio = req.file.buffer.toString('base64');
            const mimeType = 'audio/mp4'; 
            
            console.log(`[Telephony] Sending ${req.file.buffer.length} bytes to Gemini for transcription...`);
            try {
                aiResult = await generateAudioTranscription(prompt, base64Audio, mimeType, true, tenantGeminiKey);
                console.log('[Telephony] AI Transcription complete. Entries:', aiResult.transcript?.length || 0);
            } catch (aiErr) {
                console.error('[Telephony] AI Transcription failed:', aiErr.message);
            }
        } else if (!req.file && audioUrl && isAiEnabled) {
            // ─── INLINE TRANSCRIPTION FROM FIREBASE URL ───
            // Android uploaded .mp4 directly to Firebase Storage → download and transcribe automatically
            console.log('[Telephony] Inline transcription: downloading from Firebase URL...');
            const urlPrompt = `
                CRITICAL INSTRUCTION: You are an audio transcription AI. You must ONLY transcribe what is actually spoken in the audio file.
                7. DO NOT invent, fabricate, or hallucinate a conversation.
                8. If the audio is silent, unintelligible, or contains no speech, you MUST return an empty transcript array [].
                9. Focus strictly on the audio provided. If you cannot hear anything clearly, say so in the summary.

                If speech is present:
                Provide a detailed verbatim transcript, identifying the speakers. 
                Also provide a single word sentiment analysis (Positive, Neutral, Negative, or Concerned).
                
                Provide:
                1. A professional short follow-up message for WhatsApp (or empty string if no conversation).
                2. A "call_summary" which is a paragraph summarizing the discussion (or "No speech detected" if silent).
                3. A list of "key_highlights" mentioned (or empty array if silent).

                Return JSON format EXACTLY like this:
                {
                    "transcript": [
                        { "speaker": "Speaker 1", "text": "..." },
                        { "speaker": "Speaker 2", "text": "..." }
                    ],
                    "sentiment": "Neutral",
                    "whatsapp_followup": "...",
                    "call_summary": "...",
                    "key_highlights": ["..."]
                }
            `;
            try {
                aiResult = await transcribeFromUrl(audioUrl, urlPrompt, tenantGeminiKey);
                console.log('[Telephony] ✅ Inline transcription from Firebase URL complete');
            } catch (urlTranscribeErr) {
                console.error('[Telephony] Inline transcription failed:', urlTranscribeErr.message);
            }
        }

        // Prepare context for timeline & dispatch
        const transcriptLines = aiResult.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        let noteContent = `[Automated AI Transcript | Sentiment: ${aiResult.sentiment}]\n`;
        
        if (aiResult.call_summary) {
            noteContent += `\n--- AI SUMMARY ---\n${aiResult.call_summary}\n`;
            if (aiResult.key_highlights && aiResult.key_highlights.length) {
                noteContent += `\nHighlights:\n${aiResult.key_highlights.map(h => `• ${h}`).join('\n')}\n`;
            }
        }
        
        noteContent += `\n--- VERBATIM TRANSCRIPT ---\n${transcriptLines}`;

        // ─── Automated WhatsApp Dispatch ───
        if (aiResult.whatsapp_followup && leadPhone && leadPhone !== '0000') {
            const { sendWhatsappMessage } = require('../utils/whatsapp');
            const sent = await sendWhatsappMessage(req.tenantId, leadPhone, aiResult.whatsapp_followup);
            const dispatchStatus = sent ? '(✅ Auto-Delivered to WhatsApp)' : '(Drafted - Gateway Missing)';
            noteContent += `\n\n--- AI WHATSAPP FOLLOW-UP ${dispatchStatus} ---\n${aiResult.whatsapp_followup}`;
        }

        // ─── Automated Email Summary Dispatch ───
        if (aiResult.call_summary && finalLeadId) {
            const { sendEmail } = require('../utils/email');

            // Fetch Lead Email
            const leadRes = await pool.query('SELECT name, email FROM leads WHERE id = $1', [finalLeadId]);
            const lead = leadRes.rows[0];

            if (lead && lead.email && lead.email.includes('@')) {
                const emailHtml = `
                    <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; line-height: 1.6;">
                        <h2 style="color: #6366f1;">Call Summary: Our Discussion</h2>
                        <p>Hi ${lead.name.split(' ')[0]},</p>
                        <p>Thank you for speaking with our team today. Here is a brief summary of our conversation for your reference:</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #6366f1; margin: 24px 0;">
                            <strong>Summary:</strong><br/>
                            ${aiResult.call_summary}
                        </div>

                        <h3>Key Highlights:</h3>
                        <ul>
                            ${aiResult.key_highlights?.map(h => `<li>${h}</li>`).join('') || '<li>General inquiry about projects.</li>'}
                        </ul>

                        <p>Our agent will be following up with you shortly with the requested details. If you have any immediate questions, simply reply to this email.</p>
                        
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                        <p style="font-size: 12px; color: #94a3b8;">Sent automatically by Zentrix AI Assistant on behalf of ${req.user.name}.</p>
                    </div>
                `;

                await sendEmail(req.tenantId, {
                    to: lead.email,
                    subject: `Meeting Summary: Our conversation today`,
                    html: emailHtml,
                    text: `Hello ${lead.name}, here is a summary of our call: ${aiResult.call_summary}`
                });

                noteContent += `\n\n✅ AI Professional Summary emailed to ${lead.email}`;
            }
        }

        if (audioUrl) {
            noteContent += `\n\nRecording Link: ${audioUrl}`;
        }

        // Persist to Database with safety wrapping
        let savedInteractionId = interactionId;
        
        // Parse duration from Android SyncWorker (sent as string or number)
        const parsedDuration = duration ? parseInt(duration, 10) : null;
        // Determine call outcome from callType/disposition
        const callOutcome = disposition || (callType === 'INCOMING' ? 'Incoming' : 'Connected');
        
        // Safety check for valid UUID format if interactionId is provided
        const isValidUUID = (id) => id && id.length >= 32; 

        if (isValidUUID(savedInteractionId)) {
            try {
                const updateResult = await pool.query(
                    `UPDATE interactions 
                     SET note = $1, recording_url = $2, transcript = $3, sentiment = $4, 
                         duration = COALESCE($7, duration), outcome = COALESCE($8, outcome),
                         updated_at = NOW() 
                     WHERE id = $5 AND tenant_id = $6
                     RETURNING id`,
                    [noteContent, audioUrl, transcriptLines, aiResult.sentiment, savedInteractionId, req.tenantId, parsedDuration, callOutcome]
                );
                if (updateResult.rowCount === 0) {
                    console.warn(`[Telephony] Interaction ${savedInteractionId} not found for tenant ${req.tenantId}, will create new`);
                    savedInteractionId = null;
                }
            } catch (updateErr) {
                console.warn(`[Telephony] Failed to update existing interaction ${savedInteractionId}, falling back to new insertion. Error: ${updateErr.message}`);
                // Fallback to insertion if update fails
                savedInteractionId = null;
            }
        } else {
            savedInteractionId = null; // Mark as invalid to trigger insert
        }

        // If insert is needed (no valid interactionId or update failed)
        if (!savedInteractionId && finalLeadId) {
            try {
                const finalId = interactionId || crypto.randomUUID();
                const insertRes = await pool.query(
                    `INSERT INTO interactions (id, tenant_id, lead_id, user_id, type, date, note, outcome, recording_url, transcript, sentiment, duration)
                     VALUES ($1, $2, $3, $4, 'Call', NOW(), $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (id) DO UPDATE SET 
                        note = EXCLUDED.note,
                        outcome = EXCLUDED.outcome,
                        duration = EXCLUDED.duration,
                        recording_url = COALESCE(interactions.recording_url, EXCLUDED.recording_url),
                        transcript = EXCLUDED.transcript,
                        sentiment = EXCLUDED.sentiment,
                        updated_at = NOW()
                     RETURNING id`,
                    [finalId, req.tenantId, finalLeadId, req.user?.id || null, noteContent, callOutcome, audioUrl, transcriptLines, aiResult.sentiment, parsedDuration]
                );
                savedInteractionId = insertRes.rows[0]?.id;
                console.log(`[Telephony] Created/Updated interaction ${savedInteractionId} for Lead ${finalLeadId}`);
            } catch (insertErr) {
                console.error('[Telephony] Database insertion failed CRITICAL:', insertErr.message);
                return res.status(500).json({ error: `DB Error: ${insertErr.message}` });
            }
        } else if (!savedInteractionId && !finalLeadId) {
            // No lead found and no existing interaction — create an orphan interaction
            try {
                const finalId = interactionId || crypto.randomUUID();
                const orphanNote = `[Unmatched Call] Phone: ${phoneNumber || 'Unknown'}\n${noteContent}`;
                const insertRes = await pool.query(
                    `INSERT INTO interactions (id, tenant_id, lead_id, user_id, type, date, note, outcome, recording_url, transcript, sentiment, duration)
                     VALUES ($1, $2, NULL, $3, 'Call', NOW(), $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET 
                        recording_url = COALESCE(interactions.recording_url, EXCLUDED.recording_url),
                        updated_at = NOW()
                     RETURNING id`,
                    [finalId, req.tenantId, req.user?.id || null, orphanNote, callOutcome, audioUrl, transcriptLines, aiResult.sentiment, parsedDuration]
                );
                savedInteractionId = insertRes.rows[0]?.id;
                console.log(`[Telephony] Created/Updated orphan interaction ${savedInteractionId} for ${phoneNumber}`);
            } catch (orphanErr) {
                console.error('[Telephony] Orphan interaction insert failed:', orphanErr.message);
            }
        }

        // ─── SYNC WTI DISPOSITION TO CRM PIPELINE ───
        if (finalLeadId && disposition) {
            let nextStage = null;
            const disp = disposition.toLowerCase();
            if (disp.includes('interested') && !disp.includes('not')) nextStage = 'Interested';
            else if (disp.includes('not interested')) nextStage = 'Lost';
            else if (disp.includes('invalid') || disp.includes('wrong')) nextStage = 'Lost';
            else if (disp.includes('follow-up')) nextStage = 'Connected';

            if (nextStage) {
                console.log(`[Telephony] WTI Disposition '${disposition}' → Updating Lead Stage to: ${nextStage}`);
                await pool.query('UPDATE leads SET stage = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3', 
                    [nextStage, finalLeadId, req.tenantId]);
            }
        }

        // ─── PUSH TRANSCRIPT TO FIREBASE RTDB ───
        // Makes transcript available in real-time for Android app + web dashboard
        if (transcriptLines && savedInteractionId) {
            try {
                const { db: firebaseDB } = require('../utils/firebase');
                if (firebaseDB) {
                    const transcriptPayload = {
                        interaction_id: savedInteractionId,
                        phone_number: phoneNumber || 'Unknown',
                        transcript: transcriptLines,
                        sentiment: aiResult.sentiment || 'Neutral',
                        call_summary: aiResult.call_summary || '',
                        key_highlights: aiResult.key_highlights || [],
                        recording_url: audioUrl || '',
                        agent_name: req.user?.name || 'System',
                        created_at: Date.now()
                    };
                    await firebaseDB.ref(`transcripts/${req.tenantId}/${savedInteractionId}`).set(transcriptPayload);
                    console.log(`[Telephony] ✅ Transcript saved to Firebase RTDB: transcripts/${req.tenantId}/${savedInteractionId}`);
                }
            } catch (fbErr) {
                console.error('[Telephony] Firebase RTDB transcript push failed:', fbErr.message);
            }
        }

        res.json({
            success: true,
            transcript: aiResult.transcript,
            sentiment: aiResult.sentiment,
            recordingUrl: audioUrl,
            interactionId: savedInteractionId
        });

    } catch (err) {
        console.error('[Telephony] Internal processing error:', err);
        res.status(500).json({ error: 'Failed to process telephony recording' });
    }
});

/**
 * GET /api/telephony/transcript/:interactionId
 * Generates and serves a downloadable .txt transcript file for a given interaction.
 * The transcript is built on-the-fly from the DB — no separate file storage needed.
 */
router.get('/transcript/:interactionId', hybridAuth, async (req, res) => {
    try {
        const { interactionId } = req.params;

        const result = await pool.query(`
            SELECT i.transcript, i.note, i.sentiment, i.outcome, i.duration, i.date, i.type,
                   i.recording_url, i.rapport_score, i.closing_score,
                   l.name as lead_name, l.phone as lead_phone, l.email as lead_email,
                   u.name as agent_name
            FROM interactions i
            LEFT JOIN leads l ON i.lead_id = l.id
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = $1 AND i.tenant_id = $2
        `, [interactionId, req.tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Interaction not found' });
        }

        const row = result.rows[0];
        const dateStr = new Date(row.date).toLocaleString('en-IN', {
            dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
        });
        const durationMin = row.duration ? `${Math.floor(row.duration / 60)}m ${row.duration % 60}s` : 'N/A';

        // Build the .txt content
        let txtContent = '';
        txtContent += '═══════════════════════════════════════════════════════════\n';
        txtContent += '               ZENTRIX CRM — CALL TRANSCRIPT              \n';
        txtContent += '═══════════════════════════════════════════════════════════\n\n';
        txtContent += `Lead Name       : ${row.lead_name || 'Unknown'}\n`;
        txtContent += `Lead Phone      : ${row.lead_phone || 'N/A'}\n`;
        txtContent += `Lead Email      : ${row.lead_email || 'N/A'}\n`;
        txtContent += `Agent           : ${row.agent_name || 'System'}\n`;
        txtContent += `Call Date       : ${dateStr}\n`;
        txtContent += `Duration        : ${durationMin}\n`;
        txtContent += `Outcome         : ${row.outcome || 'N/A'}\n`;
        txtContent += `Sentiment       : ${row.sentiment || 'N/A'}\n`;
        if (row.rapport_score) txtContent += `Rapport Score   : ${row.rapport_score}/100\n`;
        if (row.closing_score) txtContent += `Closing Score   : ${row.closing_score}/100\n`;
        if (row.recording_url) txtContent += `Recording URL   : ${row.recording_url}\n`;
        txtContent += '\n───────────────────────────────────────────────────────────\n';
        txtContent += '                        TRANSCRIPT                        \n';
        txtContent += '───────────────────────────────────────────────────────────\n\n';

        // Use the dedicated transcript column first, fall back to note
        if (row.transcript && row.transcript.trim()) {
            // Format transcript lines nicely
            const lines = row.transcript.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                if (trimmed.startsWith('Agent:') || trimmed.startsWith('Client:')) {
                    const [speaker, ...rest] = trimmed.split(':');
                    txtContent += `[${speaker.trim().toUpperCase()}]\n`;
                    txtContent += `  ${rest.join(':').trim()}\n\n`;
                } else {
                    txtContent += `  ${trimmed}\n`;
                }
            });
        } else if (row.note) {
            // Extract readable content from note (may contain AI markers)
            const cleanNote = row.note
                .replace(/\[Automated AI Transcript.*?\]/g, '')
                .replace(/--- AI WHATSAPP FOLLOW-UP.*?---/g, '\n--- WHATSAPP FOLLOW-UP ---')
                .replace(/Recording Link:.*$/gm, '')
                .trim();
            txtContent += cleanNote + '\n';
        } else {
            txtContent += '  [No transcript available for this interaction]\n';
        }

        txtContent += '\n───────────────────────────────────────────────────────────\n';
        txtContent += `Generated by Zentrix CRM on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
        txtContent += '═══════════════════════════════════════════════════════════\n';

        // Build a clean filename (LeadName_LeadOwnerName_Timestamp.txt)
        const leadSlug = (row.lead_name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const agentSlug = (row.agent_name || 'System').replace(/[^a-zA-Z0-9]/g, '_');
        const d = new Date(row.date);
        const pad = n => n.toString().padStart(2, '0');
        const timestampSlug = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        
        const fileName = `${leadSlug}_${agentSlug}_${timestampSlug}.txt`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(txtContent);

    } catch (err) {
        console.error('[Telephony] Transcript download error:', err.message);
        res.status(500).json({ error: 'Failed to generate transcript file' });
    }
});

/**
 * GET /api/telephony/bridge-config
 * Returns the tenant's centralized bridge number and recording policy.
 * The Android WTI app polls this on startup to auto-configure itself.
 */
router.get('/bridge-config', hybridAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT settings FROM tenants WHERE id = $1`,
            [req.tenantId]
        );

        if (result.rows.length === 0) {
            return res.json({
                bridge_number: '',
                recording_enabled: true,
                recording_mode: 'device_local',
                description: 'No bridge configured. Device records locally and uploads to CRM server.'
            });
        }

        const settings = result.rows[0].settings || {};
        const bridgeNum = settings.bridge_number || '';
        const recEnabled = settings.recording_enabled !== false;
        const mode = settings.recording_mode || (bridgeNum ? 'bridge_server' : 'device_local');

        res.json({
            bridge_number: bridgeNum,
            recording_enabled: recEnabled,
            recording_mode: mode,
            description: mode === 'bridge_server'
                ? `Calls route through bridge ${bridgeNum} for server-side recording.`
                : 'Device records locally via microphone and uploads to CRM server via Wi-Fi.'
        });
    } catch (err) {
        console.error('[Telephony] Bridge config fetch error:', err.message);
        res.json({
            bridge_number: '',
            recording_enabled: true,
            recording_mode: 'device_local',
            description: 'Default config (fetch error).'
        });
    }
});

/**
 * PUT /api/telephony/bridge-config
 * Admin endpoint to set the tenant's bridge number and recording policy.
 * After saving to DB, it also pushes the config to all connected handsets via Firebase RTDB.
 */
router.put('/bridge-config', hybridAuth, async (req, res) => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Requires admin privileges' });
    }

    const { bridge_number, recording_enabled, recording_mode } = req.body;
    const mode = recording_mode || (bridge_number ? 'bridge_server' : 'device_local');

    try {
        // Merge into existing tenants.settings JSONB
        await pool.query(`
            UPDATE tenants 
            SET settings = COALESCE(settings, '{}'::jsonb) 
                || jsonb_build_object(
                    'bridge_number', $2::text,
                    'recording_enabled', $3::boolean,
                    'recording_mode', $4::text
                )
            WHERE id = $1
        `, [
            req.tenantId,
            (bridge_number || '').trim(),
            recording_enabled !== false,
            mode
        ]);

        // Push to all connected Android handsets via Firebase RTDB
        const { db: firebaseDB } = require('../utils/firebase');
        if (firebaseDB) {
            const configRef = firebaseDB.ref(`telephony_mdm_config/${req.tenantId}/recording_policy`);
            await configRef.set({
                bridge_number: (bridge_number || '').trim(),
                recording_enabled: recording_enabled !== false,
                recording_mode: mode,
                pushed_at: Date.now(),
                pushed_by: req.user.name
            });
            console.log(`[Telephony] Recording policy pushed to fleet for tenant: ${req.tenantId}`);
        }

        res.json({ success: true, message: 'Bridge configuration saved and pushed to fleet.' });
    } catch (err) {
        console.error('[Telephony] Bridge config save error:', err);
        res.status(500).json({ error: 'Failed to save bridge configuration' });
    }
});

/**
 * POST /api/telephony/push-config
 * Sends a silent configuration payload to all connected Android bridges via Firebase RTDB
 */
router.post('/push-config', auth, async (req, res) => {
    // We require admin access to push configuration to the fleet
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Requires admin privileges' });
    }

    const { db, isDbEnabled } = require('../utils/firebase');
    if (!isDbEnabled || !db) return res.status(400).json({ error: 'Firebase RTDB not connected' });

    const { storageUrl, firebaseDatabaseUrl, firebaseProjectId } = req.body;
    if (!storageUrl) return res.status(400).json({ error: 'storageUrl is required' });

    try {
        // Also fetch the recording policy to include in the push
        let bridgeConfig = { bridge_number: '', recording_enabled: true, recording_mode: 'device_local' };
        try {
            const tenantRes = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
            if (tenantRes.rows[0]?.settings) {
                const s = tenantRes.rows[0].settings;
                bridgeConfig = {
                    bridge_number: s.bridge_number || '',
                    recording_enabled: s.recording_enabled !== false,
                    recording_mode: s.recording_mode || 'device_local'
                };
            }
        } catch (e) { /* settings fetch failed, use defaults */ }

        // Push configuration to EVERY active agent's node so handsets react instantly
        const usersRes = await pool.query('SELECT name, telephony_agent_id FROM users WHERE tenant_id = $1 AND is_active = true', [req.tenantId]);
        const agents = usersRes.rows;

        const pushPromises = agents.map(async (agent) => {
            const agentKey = agent.telephony_agent_id || agent.name.replace(/[^a-zA-Z0-9]/g, '');
            const agentConfigRef = db.ref(`agents/${agentKey}/config`);
            
            // The Android app appends '/api/telephony/upload-recording' automatically, 
            // so we only push the base URL. We use a robust split to avoid 
            // truncating domains that contain 'api' (like api.zentrixcrm.com)
            let baseUrl = storageUrl;
            if (storageUrl.includes('/api/telephony')) {
                baseUrl = storageUrl.split('/api/telephony')[0];
            } else if (storageUrl.includes('/api/')) {
                baseUrl = storageUrl.split('/api/')[0];
            }

            return agentConfigRef.update({
                storage_server: baseUrl, 
                recording_enabled: bridgeConfig.recording_enabled !== false,
                pushed_at: Date.now(),
                pushed_by: req.user.name
            });
        });

        // Also update the global tenant-level config for redundancy/new joins
        const globalPushRef = db.ref(`telephony_mdm_config/${req.tenantId}`);
        pushPromises.push(globalPushRef.set({
            storageUrl: storageUrl,
            firebaseDatabaseUrl: firebaseDatabaseUrl || process.env.FIREBASE_DATABASE_URL,
            firebaseProject: firebaseProjectId || process.env.FIREBASE_PROJECT_ID,
            recording_policy: bridgeConfig,
            timestamp: Date.now(),
            forceUpdate: true
        }));

        await Promise.all(pushPromises);

        console.log(`[Telephony] Remote config pushed to ${agents.length} agents for tenant: ${req.tenantId}`);
        res.json({ success: true, message: `Configuration pushed to ${agents.length} active handsets` });
    } catch (err) {
        console.error('[Telephony] Failed to push MDM config:', err);
        res.status(500).json({ error: 'Failed to push configuration' });
    }
});

// --- AI Call Analytics Telemetry ---
/**
 * GET /api/telephony/analytics
 * Returns aggregated AI telemetry (sentiment distribution, agent leaderboard) for the Admin Dashboard
 */
router.get('/analytics', hybridAuth, async (req, res) => {
    try {
        // We only allow admins and managers to view fleet telemetry
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // 1. Sentiment Spread (Global Pie Chart)
        const sentimentQuery = await pool.query(`
            SELECT sentiment, COUNT(*) as count 
            FROM interactions 
            WHERE tenant_id = $1 AND type = 'Call' AND sentiment IS NOT NULL
            GROUP BY sentiment
        `, [req.tenantId]);

        const sentimentSpread = sentimentQuery.rows.reduce((acc, row) => {
            acc[row.sentiment] = parseInt(row.count, 10);
            return acc;
        }, { Positive: 0, Neutral: 0, Negative: 0, Concerned: 0 });

        // 2. Agent Leaderboard (Ranked by Positive Sentiment calls)
        const leaderboardQuery = await pool.query(`
            SELECT u.name, u.role, 
                   COUNT(i.id) as total_calls,
                   SUM(CASE WHEN i.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_calls
            FROM users u
            JOIN interactions i ON u.id = i.user_id
            WHERE u.tenant_id = $1 AND i.type = 'Call'
            GROUP BY u.id, u.name, u.role
            ORDER BY positive_calls DESC, total_calls DESC
            LIMIT 10
        `, [req.tenantId]);

        res.json({
            sentimentSpread,
            leaderboard: leaderboardQuery.rows.map(r => ({
                name: r.name,
                role: r.role,
                total: parseInt(r.total_calls, 10),
                positive: parseInt(r.positive_calls, 10)
            }))
        });

    } catch (err) {
        console.error('[Telephony] Analytics aggregation failed:', err);
        res.status(500).json({ error: 'Failed to fetch AI telemetry' });
    }
});

// --- Android App Command & Activity Routes ---

/**
 * POST /api/telephony/broadcast-alert
 * Triggers a Flash Alert popup on all connected Android handsets for this tenant.
 */
router.post('/broadcast-alert', hybridAuth, async (req, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only managers can trigger broadcast alerts' });
        }

        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Message text is required' });

        const { db: firebaseDB } = require('../utils/firebase');
        if (!firebaseDB) {
            return res.status(500).json({ error: 'Firebase RTDB not initialized securely' });
        }

        // Push to tenant-isolated node that the Android broadcast receiver listens to
        // If the Android app listens to a generic broadcast_message, we push it to the tenant scope
        const alertPath = `broadcasts/${req.tenantId}/broadcast_message`;
        await firebaseDB.ref(alertPath).set({
            text: text,
            timestamp: Date.now(),
            sender: req.user.name
        });

        console.log(`[MDM] Flash alert broadcasted to fleet: ${text}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[MDM] Flash alert failed:', error);
        res.status(500).json({ error: 'Failed to send broadcast alert' });
    }
});

/**
 * GET /api/telephony/agent-activity
 * Retrieves daily/weekly call performance and WiFi sync pending status for the Admin AgentActivity page.
 */
router.get('/agent-activity', hybridAuth, async (req, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Fetch Agent list for tenant
        console.log(`[MDM Debug] STEP 1: Fetching agents for tenant ${req.tenantId}`);
        const usersQuery = await pool.query('SELECT id, name, role, department, telephony_agent_id FROM users WHERE tenant_id = $1 AND is_active = true', [req.tenantId]);
        console.log(`[MDM Debug] STEP 2: Found ${usersQuery.rows.length} agents`);
        const agents = usersQuery.rows;

        // Fetch interaction metrics for Today and This Week
        console.log(`[MDM Debug] STEP 3: Fetching metrics...`);
        const metricsQuery = await pool.query(`
            SELECT 
                user_id,
                COUNT(*) filter (where created_at >= current_date) as calls_today,
                COUNT(*) filter (where created_at >= date_trunc('week', current_date)) as calls_this_week,
                COUNT(*) filter (where created_at >= date_trunc('month', current_date)) as calls_this_month,
                COUNT(*) filter (where outcome = 'Interested' OR sentiment = 'Positive') as success_calls,
                COUNT(*) filter (where recording_url IS NOT NULL AND created_at >= current_date) as synced_recordings_today,
                COUNT(*) filter (where recording_url IS NOT NULL) as synced_recordings
            FROM interactions
            WHERE tenant_id = $1 AND type = 'Call'
            GROUP BY user_id
        `, [req.tenantId]);
        console.log(`[MDM Debug] STEP 4: Metrics fetched (${metricsQuery.rows.length} users with data)`);

        const metricMap = {};
        metricsQuery.rows.forEach(r => metricMap[r.user_id] = r);

        // Fetch Firebase live network status
        console.log(`[MDM Debug] STEP 5: Connecting to Firebase...`);
        const { db: firebaseDB } = require('../utils/firebase');
        let activeSnap = null;
        if (firebaseDB) {
            console.log(`[MDM Debug] STEP 6: Querying Firebase RTDB path: telephony_mdm_config/${req.tenantId}/fleet_status`);
            const snap = await firebaseDB.ref(`telephony_mdm_config/${req.tenantId}/fleet_status`).once('value');
            activeSnap = snap.val() || {};
            console.log(`[MDM Debug] STEP 7: Firebase data received.`);
        } else {
            console.log(`[MDM Debug] STEP 6: Firebase DB not enabled, skipping realtime status.`);
        }

        console.log(`[MDM Debug] STEP 8: Mapping report...`);

        const activityReport = agents.map(agent => {
            const m = metricMap[agent.id] || { calls_today: 0, calls_this_week: 0, calls_this_month: 0, success_calls: 0, synced_recordings: 0, synced_recordings_today: 0 };

            // Compare today's calls vs today's synced recordings to determine pending uploads
            const callsToday = parseInt(m.calls_today) || 0;
            const syncedToday = parseInt(m.synced_recordings_today) || 0;
            const pendingUploads = Math.max(0, callsToday - syncedToday);
            const isSyncPending = pendingUploads > 0;

            return {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                department: agent.department || 'General',
                telephonyId: agent.telephony_agent_id || 'Not Mapped',
                callsToday: callsToday,
                callsThisWeek: parseInt(m.calls_this_week) || 0,
                callsThisMonth: parseInt(m.calls_this_month) || 0,
                successCount: parseInt(m.success_calls) || 0,
                syncedRecordings: parseInt(m.synced_recordings) || 0,
                syncStatus: isSyncPending ? `Waiting Wi-Fi (${pendingUploads} pending)` : 'Up to Date',
                isOnline: activeSnap && activeSnap[agent.telephony_agent_id || ''] === 'Online'
            };
        });

        res.json(activityReport);
    } catch (error) {
        console.error('[Telephony] Activity fetch failed CRITICAL:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: `Activity Error: ${error.message}` });
    }
});

module.exports = router;
