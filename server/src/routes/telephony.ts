import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { generateAudioTranscription, transcribeFromUrl, isAiEnabled } from '../utils/ai';
import { uploadToFirebase } from '../utils/cloudStorage';
import { isStorageEnabled, db as firebaseDB, isDbEnabled, getTenantDb } from '../utils/firebase';
import { calculateLeadScore } from '../utils/scoring';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendWhatsappMessage } from '../utils/whatsapp';
import { sendEmail } from '../utils/email';

// const __filename and __dirname are available in CommonJS, no need to manually derive from import.meta

const router = express.Router();

/**
 * Hybrid auth middleware: accepts EITHER a standard JWT Bearer token (web dashboard)
 * OR the X-Zapier-Token handset auth. This lets routes like transcript, bridge-config,
 * analytics etc. work for both logged-in users and Android handsets.
 */
function hybridAuth(req: any, res: Response, next: NextFunction) {
    const hasBearer = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
    const hasHandsetToken = req.headers['x-zapier-token'] || req.query.token;

    if (hasBearer) {
        return authenticateToken(req, res, next);
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
async function authenticateHandset(req: any, res: Response, next: NextFunction) {
    const token = req.headers['x-zapier-token'] || req.query.token;
    if (!token) {
        console.log('[Telephony] Auth failed: No token provided');
        return res.status(401).json({ error: 'Unauthorized: No token' });
    }

    const [secret, tenantId] = (token as string).split(':');
    if (!secret || !tenantId) {
        console.log('[Telephony] Auth failed: Invalid token format');
        return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }

    try {
        const tenantRes = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${tenantId}`);
        if (tenantRes.rows.length === 0) {
            console.log(`[Telephony] Auth failed: Tenant ${tenantId} not found`);
            return res.status(401).json({ error: 'Unauthorized: Tenant not found' });
        }

        const settings = tenantRes.rows[0].settings as any || {};
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
router.get('/health', authenticateHandset, (req: any, res) => {
    res.json({ status: 'ok', service: 'zentrix-telephony', storageEnabled: isStorageEnabled, aiEnabled: isAiEnabled, tenant: req.tenantId });
});

/**
 * POST /api/telephony/upload-recording
 */
router.post('/upload-recording', authenticateHandset, upload.single('audio'), async (req: any, res) => {
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
    console.log('[Telephony]   File: ' + (req.file ? req.file.originalname + ' (' + req.file.size + ' bytes)' : 'NO FILE'));

    if (!req.file && !recordingUrl) {
        console.warn('[Telephony] Syncing call log only (no recording data provided by handset)');
    }

    try {
        const tenantRes = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${req.tenantId}`);
        const tenantSettings = tenantRes.rows[0]?.settings as any || {};
        const tenantGeminiKey = tenantSettings.gemini_api_key || null;

        let finalLeadId = leadId;
        let leadPhone = phoneNumber || '0000';

        if (!finalLeadId && phoneNumber) {
            console.log(`[Telephony] No Lead ID provided. Attempting lookup for phone: ${phoneNumber}`);
            const lookupRes = await db.execute(sql`SELECT id, name FROM leads WHERE tenant_id = ${req.tenantId} AND (phone = ${phoneNumber} OR phone LIKE ${`%${phoneNumber.slice(-10)}%`})`);
            if (lookupRes.rows[0]) {
                finalLeadId = lookupRes.rows[0].id;
                console.log(`[Telephony] Found matching lead: ${lookupRes.rows[0].name} (${finalLeadId})`);
            }
        }

        console.log(`[Telephony] Processing recording for Interaction: ${interactionId || 'New'} | Lead: ${finalLeadId || 'Unknown'}`);

        let audioUrl = null;
        let leadName = 'UnknownLead';
        if (finalLeadId) {
            const leadRes = await db.execute(sql`SELECT name FROM leads WHERE id = ${finalLeadId}`);
            if (leadRes.rows[0]) leadName = String(leadRes.rows[0].name).replace(/[^a-zA-Z0-9]/g, '');
        }

        if (req.file) {
            console.log(`[Telephony] Direct file received (${req.file.buffer.length} bytes). Saving to local server...`);
            try {
                const localFolder = path.join(__dirname, '..', 'uploads', req.tenantId || 'default');
                if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder, { recursive: true });
                
                const localFileName = `${Date.now()}-${req.file.originalname}`;
                const localPath = path.join(localFolder, localFileName);
                fs.writeFileSync(localPath, req.file.buffer);
                
                const baseUrl = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5051';
                audioUrl = `${baseUrl}/uploads/${req.tenantId || 'default'}/${localFileName}`;
                console.log(`[Telephony] Local storage successful: ${audioUrl}`);

                if (isStorageEnabled) {
                    try {
                        let tenantSlug = 'general';
                        const tenantRes = await db.execute(sql`SELECT slug FROM tenants WHERE id = ${req.tenantId}`);
                        if (tenantRes.rows[0]) tenantSlug = String(tenantRes.rows[0].slug);

                        const agentNameStr = (req.user?.name || 'Handset').replace(/[^a-zA-Z0-9]/g, '');
                        const phoneLast4 = leadPhone.length >= 4 ? leadPhone.slice(-4) : leadPhone;
                        const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
                        const customFileName = `${leadName}_${agentNameStr}_${phoneLast4}_${timeStr}`;

                        const firebaseURL = await uploadToFirebase(req.file.buffer, req.file.originalname, `recordings/${tenantSlug}`, customFileName);
                        audioUrl = firebaseURL; 
                        console.log('[Telephony] Optional Firebase backup successful.');
                    } catch (fbErr) {
                        console.warn('[Telephony] Firebase backup skipped (Spark quota or 404), using Local URL.');
                    }
                }
            } catch (err: any) {
                console.error('[Telephony] CRITICAL STORAGE FAILURE:', err.message);
            }
        } else if (recordingUrl) {
            audioUrl = recordingUrl;
            console.log(`[Telephony] Using pre-uploaded Firebase Storage URL: ${audioUrl}`);
        }

        let aiResult: any = { transcript: [], sentiment: 'Neutral', call_summary: 'No speech detected' };
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
            } catch (aiErr: any) {
                console.error('[Telephony] AI Transcription failed:', aiErr.message);
            }
        } else if (!req.file && audioUrl && isAiEnabled) {
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
            } catch (urlTranscribeErr: any) {
                console.error('[Telephony] Inline transcription failed:', urlTranscribeErr.message);
            }
        }

        const transcriptLines = aiResult.transcript.map((t: any) => `${t.speaker}: ${t.text}`).join('\n');
        let noteContent = `[Automated AI Transcript | Sentiment: ${aiResult.sentiment}]\n`;
        
        if (aiResult.call_summary) {
            noteContent += `\n--- AI SUMMARY ---\n${aiResult.call_summary}\n`;
            if (aiResult.key_highlights && aiResult.key_highlights.length) {
                noteContent += `\nHighlights:\n${aiResult.key_highlights.map((h: string) => `• ${h}`).join('\n')}\n`;
            }
        }
        
        noteContent += `\n--- VERBATIM TRANSCRIPT ---\n${transcriptLines}`;

        if (aiResult.whatsapp_followup && leadPhone && leadPhone !== '0000') {
            const sent = await sendWhatsappMessage(req.tenantId, leadPhone, aiResult.whatsapp_followup);
            const dispatchStatus = sent ? '(✅ Auto-Delivered to WhatsApp)' : '(Drafted - Gateway Missing)';
            noteContent += `\n\n--- AI WHATSAPP FOLLOW-UP ${dispatchStatus} ---\n${aiResult.whatsapp_followup}`;
        }

        if (aiResult.call_summary && finalLeadId) {
            const leadRes = await db.execute(sql`SELECT name, email FROM leads WHERE id = ${finalLeadId}`);
            const lead = leadRes.rows[0] as any;

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
                            ${aiResult.key_highlights?.map((h: string) => `<li>${h}</li>`).join('') || '<li>General inquiry about projects.</li>'}
                        </ul>

                        <p>Our agent will be following up with you shortly with the requested details. If you have any immediate questions, simply reply to this email.</p>
                        
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                        <p style="font-size: 12px; color: #94a3b8;">Sent automatically by Zentrix AI Assistant on behalf of ${req.user.name}.</p>
                    </div>
                `;

                await sendEmail(req.tenantId, {
                    to: lead.email,
                    subject: `Meeting Summary: Our conversation today`,
                    html: emailHtml
                });

                noteContent += `\n\n✅ AI Professional Summary emailed to ${lead.email}`;
            }
        }

        if (audioUrl) {
            noteContent += `\n\nRecording Link: ${audioUrl}`;
        }

        let savedInteractionId = interactionId;
        const parsedDuration = duration ? parseInt(duration as string, 10) : null;
        const callOutcome = disposition || (callType === 'INCOMING' ? 'Incoming' : 'Connected');
        const isValidUUID = (id: string) => id && id.length >= 32; 

        if (isValidUUID(savedInteractionId)) {
            try {
                const updateResult = await db.execute(sql`
                    UPDATE interactions 
                     SET note = ${noteContent}, recording_url = ${audioUrl}, transcript = ${transcriptLines}, sentiment = ${aiResult.sentiment}, 
                         duration = COALESCE(${parsedDuration}, duration), outcome = COALESCE(${callOutcome}, outcome),
                         updated_at = NOW() 
                     WHERE id = ${savedInteractionId} AND tenant_id = ${req.tenantId}
                     RETURNING id
                `);
                if (updateResult.rowCount === 0) {
                    console.warn(`[Telephony] Interaction ${savedInteractionId} not found for tenant ${req.tenantId}, will create new`);
                    savedInteractionId = null;
                }
            } catch (updateErr: any) {
                console.warn(`[Telephony] Failed to update existing interaction ${savedInteractionId}, falling back to new insertion. Error: ${updateErr.message}`);
                savedInteractionId = null;
            }
        } else {
            savedInteractionId = null; 
        }

        if (!savedInteractionId && finalLeadId) {
            try {
                const finalId = interactionId || crypto.randomUUID();
                const insertRes = await db.execute(sql`
                    INSERT INTO interactions (id, tenant_id, lead_id, user_id, type, date, note, outcome, recording_url, transcript, sentiment, duration)
                     VALUES (${finalId}, ${req.tenantId}, ${finalLeadId}, ${req.user?.id || null}, 'Call', NOW(), ${noteContent}, ${callOutcome}, ${audioUrl}, ${transcriptLines}, ${aiResult.sentiment}, ${parsedDuration})
                     ON CONFLICT (id) DO UPDATE SET 
                        note = EXCLUDED.note,
                        outcome = EXCLUDED.outcome,
                        duration = EXCLUDED.duration,
                        recording_url = COALESCE(interactions.recording_url, EXCLUDED.recording_url),
                        transcript = EXCLUDED.transcript,
                        sentiment = EXCLUDED.sentiment,
                        updated_at = NOW()
                     RETURNING id
                `);
                savedInteractionId = insertRes.rows[0]?.id;
                console.log(`[Telephony] Created/Updated interaction ${savedInteractionId} for Lead ${finalLeadId}`);
            } catch (insertErr: any) {
                console.error('[Telephony] Database insertion failed CRITICAL:', insertErr.message);
                return res.status(500).json({ error: `DB Error: ${insertErr.message}` });
            }
        } else if (!savedInteractionId && !finalLeadId) {
            try {
                const finalId = interactionId || crypto.randomUUID();
                const orphanNote = `[Unmatched Call] Phone: ${phoneNumber || 'Unknown'}\n${noteContent}`;
                const insertRes = await db.execute(sql`
                    INSERT INTO interactions (id, tenant_id, lead_id, user_id, type, date, note, outcome, recording_url, transcript, sentiment, duration)
                     VALUES (${finalId}, ${req.tenantId}, NULL, ${req.user?.id || null}, 'Call', NOW(), ${orphanNote}, ${callOutcome}, ${audioUrl}, ${transcriptLines}, ${aiResult.sentiment}, ${parsedDuration})
                     ON CONFLICT (id) DO UPDATE SET 
                        recording_url = COALESCE(interactions.recording_url, EXCLUDED.recording_url),
                        updated_at = NOW()
                     RETURNING id
                `);
                savedInteractionId = insertRes.rows[0]?.id;
                console.log(`[Telephony] Created/Updated orphan interaction ${savedInteractionId} for ${phoneNumber}`);
            } catch (orphanErr: any) {
                console.error('[Telephony] Orphan interaction insert failed:', orphanErr.message);
            }
        }

        if (finalLeadId && disposition) {
            let nextStage = null;
            const disp = (disposition as string).toLowerCase();
            if (disp.includes('interested') && !disp.includes('not')) nextStage = 'Interested';
            else if (disp.includes('not interested')) nextStage = 'Lost';
            else if (disp.includes('invalid') || disp.includes('wrong')) nextStage = 'Lost';
            else if (disp.includes('follow-up')) nextStage = 'Connected';

            if (nextStage) {
                console.log(`[Telephony] WTI Disposition '${disposition}' → Updating Lead Stage to: ${nextStage}`);
                await db.execute(sql`UPDATE leads SET stage = ${nextStage}, updated_at = NOW() WHERE id = ${finalLeadId} AND tenant_id = ${req.tenantId}`);
            }
        }

        if (transcriptLines && savedInteractionId) {
            try {
                let activeFirebaseDB = firebaseDB;

                if (!isDbEnabled || !activeFirebaseDB) {
                    activeFirebaseDB = getTenantDb({
                        projectId: tenantSettings.firebase_project_id,
                        clientEmail: tenantSettings.firebase_client_email,
                        privateKey: tenantSettings.firebase_private_key,
                        databaseURL: tenantSettings.firebase_database_url
                    });
                }

                if (activeFirebaseDB) {
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
                    await (activeFirebaseDB as any).ref(`transcripts/${req.tenantId}/${savedInteractionId}`).set(transcriptPayload);
                    console.log(`[Telephony] ✅ Transcript saved to Firebase RTDB: transcripts/${req.tenantId}/${savedInteractionId}`);
                }
            } catch (fbErr: any) {
                console.error('[Telephony] Firebase RTDB transcript push failed:', fbErr.message);
            }
        }

        if (finalLeadId) {
            calculateLeadScore(finalLeadId, req.tenantId).catch(err => {
                console.error('[AUTO SCORING] Background job failed:', err.message);
            });
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
 */
router.get('/transcript/:interactionId', hybridAuth, async (req: any, res) => {
    try {
        const { interactionId } = req.params;

        const result = await db.execute(sql`
            SELECT i.transcript, i.note, i.sentiment, i.outcome, i.duration, i.date, i.type,
                   i.recording_url, i.rapport_score, i.closing_score, i.lead_id,
                   l.name as lead_name, l.phone as lead_phone, l.email as lead_email,
                   u.name as agent_name
            FROM interactions i
            LEFT JOIN leads l ON i.lead_id = l.id
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = ${interactionId} AND i.tenant_id = ${req.tenantId}
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Interaction not found' });
        }

        const row: any = result.rows[0];
        const dateStr = new Date(row.date).toLocaleString('en-IN', {
            dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
        });
        const durationMin = row.duration ? `${Math.floor(row.duration / 60)}m ${row.duration % 60}s` : 'N/A';

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

        if (row.transcript && row.transcript.trim()) {
            const lines = row.transcript.split('\n');
            lines.forEach((line: string) => {
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

        const leadSlug = (row.lead_name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const agentSlug = (row.agent_name || 'System').replace(/[^a-zA-Z0-9]/g, '_');
        const d = new Date(row.date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timestampSlug = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        
        const fileName = `${leadSlug}_${agentSlug}_${timestampSlug}.txt`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        if (row.lead_id) {
            calculateLeadScore(row.lead_id, req.tenantId).catch(err => {
                console.error('[AUTO SCORING] Background job failed:', err.message);
            });
        }

        res.send(txtContent);

    } catch (err: any) {
        console.error('[Telephony] Transcript download error:', err.message);
        res.status(500).json({ error: 'Failed to generate transcript file' });
    }
});

/**
 * GET /api/telephony/bridge-config
 */
router.get('/bridge-config', hybridAuth, async (req: any, res) => {
    try {
        const result = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${req.tenantId}`);

        if (result.rows.length === 0) {
            return res.json({
                bridge_number: '',
                recording_enabled: true,
                recording_mode: 'device_local',
                description: 'No bridge configured. Device records locally and uploads to CRM server.'
            });
        }

        const settings = result.rows[0].settings as any || {};
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
    } catch (err: any) {
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
 */
router.put('/bridge-config', hybridAuth, async (req: any, res) => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Requires admin privileges' });
    }

    const { bridge_number, recording_enabled, recording_mode } = req.body;
    const mode = recording_mode || (bridge_number ? 'bridge_server' : 'device_local');

    try {
        await db.execute(sql`
            UPDATE tenants 
            SET settings = COALESCE(settings, '{}'::jsonb) 
                || jsonb_build_object(
                    'bridge_number', ${(bridge_number || '').trim()}::text,
                    'recording_enabled', ${recording_enabled !== false}::boolean,
                    'recording_mode', ${mode}::text
                )
            WHERE id = ${req.tenantId}
        `);

        let activeFirebaseDB = firebaseDB;
        
        if (!isDbEnabled || !activeFirebaseDB) {
            const tenantRes = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${req.tenantId}`);
            const s = tenantRes.rows[0]?.settings as any || {};
            activeFirebaseDB = getTenantDb({
                projectId: s.firebase_project_id,
                clientEmail: s.firebase_client_email,
                privateKey: s.firebase_private_key,
                databaseURL: s.firebase_database_url
            });
        }

        if (activeFirebaseDB) {
            const configRef = (activeFirebaseDB as any).ref(`telephony_mdm_config/${req.tenantId}/recording_policy`);
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
 */
router.post('/push-config', authenticateToken, async (req: any, res) => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Requires admin privileges' });
    }

    let activeDb = firebaseDB;
    if (!isDbEnabled || !activeDb) {
        console.log(`[Telephony] Global Firebase not connected. Attempting tenant-specific init for ${req.tenantId}`);
        try {
            const tenantRes = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${req.tenantId}`);
            const s = tenantRes.rows[0]?.settings as any || {};
            activeDb = getTenantDb({
                projectId: s.firebase_project_id,
                clientEmail: s.firebase_client_email,
                privateKey: s.firebase_private_key,
                databaseURL: s.firebase_database_url
            });
        } catch (e: any) {
            console.error('[Telephony] Tenant config fetch failed during fallback init:', e.message);
        }
    }

    if (!activeDb) return res.status(400).json({ error: 'Firebase RTDB not connected. Please configure Service Account in Admin Settings.' });

    const { storageUrl, firebaseDatabaseUrl, firebaseProjectId } = req.body;
    if (!storageUrl) return res.status(400).json({ error: 'storageUrl is required' });

    try {
        let bridgeConfig = { bridge_number: '', recording_enabled: true, recording_mode: 'device_local' };
        try {
            const tenantRes = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${req.tenantId}`);
            if (tenantRes.rows[0]?.settings) {
                const s = tenantRes.rows[0].settings as any;
                bridgeConfig = {
                    bridge_number: s.bridge_number || '',
                    recording_enabled: s.recording_enabled !== false,
                    recording_mode: s.recording_mode || 'device_local'
                };
            }
        } catch (e) { }

        const usersRes = await db.execute(sql`SELECT name, telephony_agent_id FROM users WHERE tenant_id = ${req.tenantId} AND is_active = true`);
        const agents = usersRes.rows as any[];

        const pushPromises = agents.map(async (agent) => {
            const agentKey = agent.telephony_agent_id || agent.name.replace(/[^a-zA-Z0-9]/g, '');
            const agentConfigRef = (activeDb as any).ref(`agents/${agentKey}/config`);
            
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

        const globalPushRef = (activeDb as any).ref(`telephony_mdm_config/${req.tenantId}`);
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

// GET /api/telephony/agent-activity
router.get('/agent-activity', authenticateToken, async (req: any, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Requires manager or admin privileges' });
        }

        const { rows } = await db.execute(sql`
            SELECT u.name, u.department, u.telephony_agent_id as "telephonyId",
                   COUNT(i.id) as total_calls,
                   COALESCE(SUM(i.duration), 0) as total_duration,
                   MAX(i.date) as last_active,
                   CASE 
                     WHEN MAX(i.date) >= NOW() - INTERVAL '5 minutes' THEN true 
                     ELSE false 
                   END as "isOnline",
                   'Up to Date' as "syncStatus"
            FROM users u
            LEFT JOIN interactions i ON i.user_id = u.id AND i.date >= NOW() - INTERVAL '24 hours'
            WHERE u.tenant_id = ${req.tenantId} AND u.is_active = true
            GROUP BY u.id
            ORDER BY total_calls DESC
        `);

        res.json(rows);
    } catch (err) {
        console.error('[Telephony] Agent activity error:', err);
        res.status(500).json({ error: 'Failed to fetch agent activity' });
    }
});

// GET /api/telephony/analytics
router.get('/analytics', hybridAuth, async (req: any, res) => {
    try {
        if (!['admin', 'superadmin', 'sales_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Requires manager or admin privileges' });
        }

        const statsRes = await db.execute(sql`
            SELECT 
                COUNT(*) FILTER (WHERE sentiment = 'Positive') as positive,
                COUNT(*) FILTER (WHERE sentiment = 'Negative') as negative,
                COUNT(*) FILTER (WHERE sentiment = 'Neutral') as neutral,
                COUNT(*) FILTER (WHERE sentiment = 'Concerned') as concerned,
                AVG(rapport_score) as avg_rapport,
                AVG(closing_score) as avg_closing,
                COUNT(*) as total_calls,
                SUM(duration) as total_duration
            FROM interactions 
            WHERE tenant_id = ${req.tenantId} AND type = 'Call' AND date >= NOW() - INTERVAL '30 days'
        `);

        const agentLeaderboardRes = await db.execute(sql`
            SELECT u.name, u.avatar, 
                   COUNT(i.id) as calls,
                   AVG(i.rapport_score) as rapport,
                   SUM(i.duration) as talk_time
            FROM users u
            JOIN interactions i ON i.user_id = u.id
            WHERE u.tenant_id = ${req.tenantId} AND i.type = 'Call' AND i.date >= NOW() - INTERVAL '30 days'
            GROUP BY u.id
            ORDER BY calls DESC LIMIT 10
        `);

        res.json({
            stats: statsRes.rows[0],
            leaderboard: agentLeaderboardRes.rows
        });
    } catch (err) {
        console.error('[Telephony] Analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
