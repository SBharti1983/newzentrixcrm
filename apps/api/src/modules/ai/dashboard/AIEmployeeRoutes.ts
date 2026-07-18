/**
 * AIEmployeeRoutes — Express API CRUD handlers for managing AI Digital Employees
 * 
 * Provides endpoints for retrieving, saving, and adjusting persona/voice/scheduler properties.
 * 
 * Mounted at: /api/v1/ai/employees
 */

import express, { Response } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import pool from '../../../db/pool';
import { logger } from '@zentrix/logger';
import axios from 'axios';

const router = express.Router();

router.use(authenticateToken);

// ── GET / — Retrieve all AI agent profiles for tenant ────────────────
router.get('/', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;

        // Query existing agents for this tenant
        let { rows: agents } = await pool.query(
            `SELECT id, employee_name, employee_code, role, avatar_url, 
                    persona_config, voice_config, knowledge_scope, escalation_rules,
                    is_active, shift_start_time, shift_end_time, cooldown_seconds,
                    max_concurrent_calls, current_status
             FROM ai_employee_personas
             WHERE tenant_id = $1
             ORDER BY created_at ASC`,
            [tenantId]
        );

        // Helper to check if a specific role is present
        const hasRole = (roleName: string) => agents.some((a: any) => a.role === roleName);

        // Auto-seed missing agents if they don't exist
        let seededNew = false;

        if (!hasRole('rohan')) {
            await pool.query(
                `INSERT INTO ai_employee_personas (
                    tenant_id, employee_name, employee_code, role, avatar_url,
                    persona_config, voice_config, shift_start_time, shift_end_time,
                    cooldown_seconds, max_concurrent_calls, current_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    tenantId,
                    'Rohan Mishra',
                    'ZEN-AI-001',
                    'rohan',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                    JSON.stringify({
                        language: 'hinglish',
                        dialect: 'Noida/Delhi Hindi Accent',
                        formality: 40,
                        humor: 65,
                        assertiveness: 75,
                        fillerWords: ['bhai', 'matlab', 'bilkul', 'dekhiye'],
                        greetingMorning: 'Ram Ram ji! Main Rohan baat kar raha hu Maya Infratech se.',
                        greetingAfternoon: 'Namaste sir, Rohan baat kar raha hu Maya Infratech se. Kaise hain aap?',
                        greetingEvening: 'Namaste! Good evening sir, Maya Infratech se Rohan. Kuch help kar sakta hu?'
                    }),
                    JSON.stringify({
                        engine: 'ElevenLabs Multilingual V2',
                        voiceId: 'eleven_rohan_premium_v4',
                        speechRate: 1.05,
                        pitch: 0.98,
                        stability: 0.72,
                        clonedSamples: ['sample_voice_rohan_01.wav', 'sample_voice_rohan_02.wav']
                    }),
                    '10:00:00',
                    '20:00:00',
                    45,
                    2,
                    'offline'
                ]
            );
            seededNew = true;
        }

        if (!hasRole('neha')) {
            await pool.query(
                `INSERT INTO ai_employee_personas (
                    tenant_id, employee_name, employee_code, role, avatar_url,
                    persona_config, voice_config, shift_start_time, shift_end_time,
                    cooldown_seconds, max_concurrent_calls, current_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    tenantId,
                    'Neha Sharma',
                    'ZEN-AI-002',
                    'neha',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
                    JSON.stringify({
                        language: 'hinglish',
                        dialect: 'Corporate formal accent',
                        formality: 85,
                        humor: 20,
                        assertiveness: 60,
                        fillerWords: ['dekhiye', 'as per policy', 'kindly note'],
                        greetingMorning: 'Namaste sir, main Neha baat kar rahi hu accounts desk se.',
                        greetingAfternoon: 'Namaste, Neha from accounts department, Maya Infratech. How can I help you?',
                        greetingEvening: 'Good evening, Neha here from accounts division. Hope you are doing well.'
                    }),
                    JSON.stringify({
                        engine: 'ElevenLabs Multilingual V2',
                        voiceId: 'eleven_neha_finance_v2',
                        speechRate: 1.0,
                        pitch: 1.05,
                        stability: 0.85,
                        clonedSamples: ['neha_sample_01.wav']
                    }),
                    '10:00:00',
                    '18:30:00',
                    90,
                    1,
                    'offline'
                ]
            );
            seededNew = true;
        }

        if (!hasRole('monika')) {
            await pool.query(
                `INSERT INTO ai_employee_personas (
                    tenant_id, employee_name, employee_code, role, avatar_url,
                    persona_config, voice_config, shift_start_time, shift_end_time,
                    cooldown_seconds, max_concurrent_calls, current_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    tenantId,
                    'Monika Receptionist',
                    'ZEN-AI-003',
                    'monika',
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80',
                    JSON.stringify({
                        language: 'hinglish',
                        dialect: 'Polite front desk pitch',
                        formality: 70,
                        humor: 40,
                        assertiveness: 45,
                        fillerWords: ['surely', 'hold on', 'please note'],
                        greetingMorning: 'Good morning, Maya Infratech reception se Monika. Main aapki kaise madad kar sakti hu?',
                        greetingAfternoon: 'Maya Infratech, good afternoon, Monika speaking. Whom would you like to speak to?',
                        greetingEvening: 'Good evening, welcome to Maya Infratech. Main Monika reception desk se.'
                    }),
                    JSON.stringify({
                        engine: 'ElevenLabs Multilingual V2',
                        voiceId: 'eleven_monika_frontdesk_v1',
                        speechRate: 0.98,
                        pitch: 1.12,
                        stability: 0.88,
                        clonedSamples: ['monika_voice_sample.mp3']
                    }),
                    '08:00:00',
                    '20:00:00',
                    15,
                    5,
                    'offline'
                ]
            );
            seededNew = true;
        }

        // Re-query if any seeding occurred
        if (seededNew) {
            const requery = await pool.query(
                `SELECT id, employee_name, employee_code, role, avatar_url, 
                        persona_config, voice_config, knowledge_scope, escalation_rules,
                        is_active, shift_start_time, shift_end_time, cooldown_seconds,
                        max_concurrent_calls, current_status
                 FROM ai_employee_personas
                 WHERE tenant_id = $1
                 ORDER BY created_at ASC`,
                [tenantId]
            );
            agents = requery.rows;
        }

        res.json({ success: true, data: agents });
    } catch (err: any) {
        console.error('[AIEmployeeRoutes] GET / failed:', err);
        res.status(500).json({ error: 'Failed to fetch AI employee profiles' });
    }
});

// ── GET /:id — Retrieve single AI agent profile ──────────────────────
router.get('/:id', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;

        const { rows: agent } = await pool.query(
            `SELECT id, employee_name, employee_code, role, avatar_url, 
                    persona_config, voice_config, knowledge_scope, escalation_rules,
                    is_active, shift_start_time, shift_end_time, cooldown_seconds,
                    max_concurrent_calls, current_status
             FROM ai_employee_personas
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
        );

        if (!agent[0]) {
            return res.status(404).json({ error: 'AI Employee profile not found' });
        }

        res.json({ success: true, data: agent[0] });
    } catch (err: any) {
        console.error(`[AIEmployeeRoutes] GET /${req.params.id} failed:`, err);
        res.status(500).json({ error: 'Failed to fetch AI employee profile' });
    }
});

// ── PUT /:id — Update AI agent configurations ─────────────────────────
router.put('/:id', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const {
            employee_name,
            role,
            persona_config,
            voice_config,
            knowledge_scope,
            escalation_rules,
            shift_start_time,
            shift_end_time,
            cooldown_seconds
        } = req.body;

        // Perform transactional update on SQL database
        const { rows: updated } = await pool.query(
            `UPDATE ai_employee_personas
             SET employee_name = COALESCE($3, employee_name),
                 role = COALESCE($4, role),
                 persona_config = COALESCE($5, persona_config),
                 voice_config = COALESCE($6, voice_config),
                 shift_start_time = COALESCE($7, shift_start_time),
                 shift_end_time = COALESCE($8, shift_end_time),
                 cooldown_seconds = COALESCE($9, cooldown_seconds),
                 knowledge_scope = COALESCE($10, knowledge_scope),
                 escalation_rules = COALESCE($11, escalation_rules),
                 updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2
             RETURNING id, employee_name, role, persona_config, voice_config, 
                       shift_start_time, shift_end_time, cooldown_seconds,
                       knowledge_scope, escalation_rules`,
            [
                tenantId, 
                id, 
                employee_name, 
                role, 
                persona_config ? JSON.stringify(persona_config) : null,
                voice_config ? JSON.stringify(voice_config) : null,
                shift_start_time || null,
                shift_end_time || null,
                cooldown_seconds !== undefined ? cooldown_seconds : null,
                knowledge_scope ? JSON.stringify(knowledge_scope) : null,
                escalation_rules ? JSON.stringify(escalation_rules) : null
            ]
        );

        if (!updated[0]) {
            return res.status(404).json({ error: 'AI Employee profile not found or unauthorized' });
        }

        res.json({ success: true, message: 'AI Employee profile updated successfully', data: updated[0] });
    } catch (err: any) {
        console.error(`[AIEmployeeRoutes] PUT /${req.params.id} failed:`, err);
        res.status(500).json({ error: 'Failed to update AI employee profile' });
    }
});

// ── POST /:id/pause — Pause AI employee dialing loops ────────────────
router.post('/:id/pause', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;

        const { rows } = await pool.query(
            `UPDATE ai_employee_personas
             SET current_status = 'paused', updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2
             RETURNING id, employee_name, current_status`,
            [tenantId, id]
        );

        if (!rows[0]) {
            return res.status(404).json({ error: 'AI Employee profile not found or unauthorized' });
        }

        logger.info(`[Manager Control] AI Employee "${rows[0].employee_name}" paused by manager.`);
        res.json({ success: true, message: 'AI Employee paused successfully', data: rows[0] });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] POST /${req.params.id}/pause failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to pause AI employee' });
    }
});

// ── POST /:id/resume — Resume AI employee dialing loops ───────────────
router.post('/:id/resume', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;

        const { rows } = await pool.query(
            `UPDATE ai_employee_personas
             SET current_status = 'idle', updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2
             RETURNING id, employee_name, current_status`,
            [tenantId, id]
        );

        if (!rows[0]) {
            return res.status(404).json({ error: 'AI Employee profile not found or unauthorized' });
        }

        logger.info(`[Manager Control] AI Employee "${rows[0].employee_name}" resumed by manager.`);
        res.json({ success: true, message: 'AI Employee resumed successfully', data: rows[0] });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] POST /${req.params.id}/resume failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to resume AI employee' });
    }
});

// ── PUT /:id/capacity — Update AI concurrent lines limit ──────────────
router.put('/:id/capacity', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { max_concurrent_calls } = req.body;

        if (max_concurrent_calls === undefined || max_concurrent_calls < 1) {
            return res.status(400).json({ error: 'Invalid max_concurrent_calls value' });
        }

        const { rows } = await pool.query(
            `UPDATE ai_employee_personas
             SET max_concurrent_calls = $3, updated_at = NOW()
             WHERE tenant_id = $1 AND id = $2
             RETURNING id, employee_name, max_concurrent_calls`,
            [tenantId, id, max_concurrent_calls]
        );

        if (!rows[0]) {
            return res.status(404).json({ error: 'AI Employee profile not found or unauthorized' });
        }

        logger.info(`[Manager Control] AI Employee "${rows[0].employee_name}" concurrency limit updated to ${max_concurrent_calls}.`);
        res.json({ success: true, message: 'AI employee capacity updated successfully', data: rows[0] });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] PUT /${req.params.id}/capacity failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to update AI capacity' });
    }
});

// ── GET /:id/telephony — Retrieve tenant SIP/telephony config ──────────
router.get('/:id/telephony', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;

        const { rows } = await pool.query(
            `SELECT settings FROM tenants WHERE id = $1`,
            [tenantId]
        );

        if (!rows[0]) {
            return res.status(404).json({ error: 'Tenant configuration not found' });
        }

        const settings = rows[0].settings || {};
        const sipConfig = settings.sip_config || {
            provider: 'gsm_gateway',
            api_key: '',
            api_secret: '',
            sid: '',
            from_number: ''
        };

        res.json({ success: true, sipConfig });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] GET /:id/telephony failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch telephony configuration' });
    }
});

// ── PUT /:id/telephony — Update tenant SIP/telephony config ─────────────
router.put('/:id/telephony', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { provider, api_key, api_secret, sid, from_number } = req.body;

        const { rows } = await pool.query(
            `SELECT settings FROM tenants WHERE id = $1`,
            [tenantId]
        );

        if (!rows[0]) {
            return res.status(404).json({ error: 'Tenant configuration not found' });
        }

        const settings = rows[0].settings || {};
        settings.sip_config = {
            provider: provider || 'gsm_gateway',
            api_key: api_key || '',
            api_secret: api_secret || '',
            sid: sid || '',
            from_number: from_number || ''
        };

        await pool.query(
            `UPDATE tenants SET settings = $1 WHERE id = $2`,
            [settings, tenantId]
        );

        logger.info(`[Manager Control] SIP/Telephony gateway configuration updated for tenant ${tenantId}. Provider: ${provider}`);
        res.json({ success: true, message: 'Telephony configuration updated successfully', sipConfig: settings.sip_config });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] PUT /:id/telephony failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to update telephony configuration' });
    }
});

// ── POST /:id/call-now — Immediate call trigger (bypasses pacing queue) ──
router.post('/:id/call-now', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { id: agentId } = req.params;
        const { leadId } = req.body;

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' });
        }

        // Fetch target lead details
        const { rows: leadRows } = await pool.query(
            `SELECT id, name, phone, tenant_id FROM leads WHERE id = $1 AND tenant_id = $2`,
            [leadId, tenantId]
        );
        const lead = leadRows[0];
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Fetch AI Agent credentials to verify
        const { rows: agentRows } = await pool.query(
            `SELECT id, employee_name, role FROM ai_employee_personas WHERE id = $1 AND tenant_id = $2`,
            [agentId, tenantId]
        );
        const agent = agentRows[0];
        if (!agent) {
            return res.status(404).json({ error: 'AI agent profile not found' });
        }

        logger.info(`[Manager Control] Triggering immediate call with agent "${agent.employee_name}" for lead "${lead.name}"...`);

        // Send a post request to the digital employee bridge handshake endpoint to attach the agent
        const voiceUrl = process.env.DIGITAL_EMPLOYEE_URL || 'http://localhost:5061';
        try {
            await axios.post(
                `${voiceUrl}/rohan/handshake`,
                {
                    tenant_id: parseInt(tenantId) || 1,
                    lead_id: lead.id,
                    lead_name: lead.name,
                    source: 'Manager Call Now',
                    channel: 'voice'
                },
                {
                    headers: {
                        'x-internal-key': process.env.ROHAN_BRIDGE_SECRET || process.env.JWT_SECRET || 'secret'
                    }
                }
            );
        } catch (err: any) {
            logger.warn(`[AIEmployeeRoutes] Call-now handshake trigger offline. Proceeding to trigger outbound dial.`);
        }

        // Trigger outbound call
        const crmUrl = process.env.CRM_API_URL || 'http://localhost:4000';
        const response = await axios.post(`${crmUrl}/api/v1/telephony/outbound/dial`, {
            leadId: lead.id,
            phone: lead.phone,
            tenantId: lead.tenant_id
        });

        res.json({
            success: true,
            message: 'Immediate outbound call triggered successfully',
            data: response.data
        });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] POST /${req.params.id}/call-now failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to trigger immediate call' });
    }
});

// ── POST /:id/chat — Proxy chat simulation request to digital employee ──
router.post('/:id/chat', async (req: any, res: Response) => {
    try {
        const tenantId = req.tenantId;
        const { messageText } = req.body;

        if (!messageText) {
            return res.status(400).json({ error: 'messageText is required' });
        }

        const voiceUrl = process.env.DIGITAL_EMPLOYEE_URL || 'http://localhost:5061';
        const response = await axios.post(
            `${voiceUrl}/rohan/chat`,
            {
                tenant_id: parseInt(tenantId) || 1,
                from_phone: '9999999999',
                message_text: messageText,
                channel: 'voice'
            },
            {
                headers: {
                    'x-internal-key': process.env.ROHAN_BRIDGE_SECRET || process.env.JWT_SECRET || 'secret'
                }
            }
        );

        res.json({
            success: true,
            message: response.data.data?.message || 'I am listening.'
        });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] POST /${req.params.id}/chat failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to query AI employee brain' });
    }
});


// ── GET /:id/health — Live connectivity health check for AI agent ──────
router.get('/:id/health', async (req: any, res: Response) => {
    try {
        const agentId = req.params.id;
        const tenantId = req.tenantId;

        interface HealthCheck {
            name: string;
            status: 'ok' | 'warn' | 'error';
            message: string;
            detail?: string;
        }

        const checks: HealthCheck[] = [];
        let overallConnected = true;

        // 1. Persona Database Record
        const { rows: personas } = await pool.query(
            `SELECT id, employee_name, role, current_status, is_active, 
                    shift_start_time, shift_end_time, cooldown_seconds, 
                    max_concurrent_calls, max_daily_outbound, tenant_id,
                    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time >= shift_start_time 
                     AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time <= shift_end_time) as is_within_shift
             FROM ai_employee_personas 
             WHERE id = $1 AND tenant_id = $2`,
            [agentId, tenantId]
        );
        const persona = personas[0];
        if (!persona) {
            checks.push({ name: 'Persona Config', status: 'error', message: 'Agent persona not found in database', detail: 'No ai_employee_personas row matches this agent ID and tenant.' });
            overallConnected = false;
        } else {
            checks.push({ name: 'Persona Config', status: 'ok', message: `${persona.employee_name} (${persona.role}) loaded` });

            // 2. Active Status
            if (!persona.is_active) {
                checks.push({ name: 'Agent Activation', status: 'error', message: 'Agent is deactivated (is_active = false)', detail: 'Re-enable the agent from the admin panel.' });
                overallConnected = false;
            } else {
                checks.push({ name: 'Agent Activation', status: 'ok', message: 'Agent is enabled and active' });
            }

            // 3. Current Operational Status
            if (persona.current_status === 'offline') {
                checks.push({ name: 'Operational Status', status: 'warn', message: `Agent is offline (status: ${persona.current_status})`, detail: 'The shift scheduler sets status to offline outside shift hours.' });
            } else if (persona.current_status === 'paused') {
                checks.push({ name: 'Operational Status', status: 'warn', message: 'Agent is paused by manager', detail: 'A manager manually paused this agent. Click Resume to reactivate.' });
            } else {
                checks.push({ name: 'Operational Status', status: 'ok', message: `Agent operational (status: ${persona.current_status})` });
            }

            // 4. Shift Hours
            if (!persona.is_within_shift) {
                const { rows: timeRows } = await pool.query(
                    `SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time AS ist_time`
                );
                const istNow = timeRows[0]?.ist_time?.substring(0, 5) || 'unknown';
                checks.push({
                    name: 'Shift Hours',
                    status: 'warn',
                    message: `Outside shift hours`,
                    detail: `Current IST: ${istNow}. Shift: ${persona.shift_start_time?.substring(0, 5)} – ${persona.shift_end_time?.substring(0, 5)}. Rohan will auto-activate when shift starts.`
                });
            } else {
                checks.push({ name: 'Shift Hours', status: 'ok', message: `Within shift (${persona.shift_start_time?.substring(0, 5)} – ${persona.shift_end_time?.substring(0, 5)} IST)` });
            }
        }

        // 5. AI User Account (users table)
        const { rows: aiUsers } = await pool.query(
            `SELECT id, name, is_active FROM users WHERE is_ai_employee = TRUE AND is_active = TRUE LIMIT 1`
        );
        if (!aiUsers.length) {
            checks.push({ name: 'User Account', status: 'error', message: 'No active AI user account found in users table', detail: 'A users row with is_ai_employee = true is required for lead assignment.' });
            overallConnected = false;
        } else {
            checks.push({ name: 'User Account', status: 'ok', message: `User: ${aiUsers[0].name} (${aiUsers[0].id.substring(0, 8)}…)` });
        }

        // 6. Lead Queue — check if any leads are assigned and dialable
        if (aiUsers.length && persona) {
            const { rows: leadCount } = await pool.query(
                `SELECT COUNT(*) as total FROM leads 
                 WHERE assigned_to = $1 AND tenant_id = $2
                   AND status IN ('PENDING', 'new', 'followup', 'Active', 'active', 'nurture', 'contacted', 'qualified', 'follow_up_required', 'site_visit_scheduled')`,
                [aiUsers[0].id, persona.tenant_id]
            );
            const total = parseInt(leadCount[0]?.total || '0');

            // Check how many are not-yet-called today
            const { rows: dialableCount } = await pool.query(
                `SELECT COUNT(*) as dialable FROM leads l
                 LEFT JOIN interactions i ON i.lead_id = l.id AND i.type = 'Call' AND i.date >= CURRENT_DATE
                 WHERE l.assigned_to = $1 AND l.tenant_id = $2
                   AND l.status IN ('PENDING', 'new', 'followup', 'Active', 'active', 'nurture', 'contacted', 'qualified', 'follow_up_required', 'site_visit_scheduled')
                   AND i.id IS NULL`,
                [aiUsers[0].id, persona.tenant_id]
            );
            const dialable = parseInt(dialableCount[0]?.dialable || '0');

            if (total === 0) {
                checks.push({ name: 'Lead Queue', status: 'warn', message: 'No leads assigned to Rohan', detail: 'Assign leads using [Assign to Rohan] from the CRM Kanban board.' });
            } else if (dialable === 0) {
                checks.push({ name: 'Lead Queue', status: 'warn', message: `${total} leads assigned but all already called today`, detail: 'Rohan will not re-dial leads that were already contacted today. New leads or tomorrow will resolve this.' });
            } else {
                checks.push({ name: 'Lead Queue', status: 'ok', message: `${dialable} leads ready to dial (${total} total assigned)` });
            }
        }

        // 7. Digital Employee Server (apps/digital-employee)
        const voiceUrl = process.env.DIGITAL_EMPLOYEE_URL || 'http://localhost:5061';
        try {
            const healthRes = await axios.get(`${voiceUrl}/health`, { timeout: 3000 });
            if (healthRes.status === 200) {
                checks.push({ name: 'Digital Employee Server', status: 'ok', message: `Connected to ${voiceUrl}` });
            } else {
                checks.push({ name: 'Digital Employee Server', status: 'error', message: `Server responded with status ${healthRes.status}`, detail: `The Rohan brain server at ${voiceUrl} returned a non-200 status.` });
                overallConnected = false;
            }
        } catch (err: any) {
            checks.push({
                name: 'Digital Employee Server',
                status: 'error',
                message: 'Rohan brain server is offline',
                detail: `Cannot reach ${voiceUrl}. Start the digital-employee app: cd apps/digital-employee && npm run dev`
            });
            overallConnected = false;
        }

        // 8. Telephony Gateway
        try {
            const { rows: tenantRows } = await pool.query(
                'SELECT settings FROM tenants WHERE id = $1',
                [persona?.tenant_id || tenantId]
            );
            const settings = tenantRows[0]?.settings || {};
            const sipConfig = settings.sip_config;
            if (!sipConfig || !sipConfig.provider || !sipConfig.api_key) {
                checks.push({
                    name: 'Telephony Gateway',
                    status: 'warn',
                    message: 'No SIP/GSM gateway configured for this tenant',
                    detail: 'Configure sip_config in tenant settings with provider (exotel/twilio/gsm_gateway), api_key, and from_number.'
                });
            } else {
                checks.push({ name: 'Telephony Gateway', status: 'ok', message: `Provider: ${sipConfig.provider} (${sipConfig.from_number || 'no caller ID'})` });
            }
        } catch {
            checks.push({ name: 'Telephony Gateway', status: 'warn', message: 'Could not read tenant telephony settings' });
        }

        // 9. Background Worker (check if pacing engine has run recently by checking latest interaction)
        try {
            const { rows: recentInteraction } = await pool.query(
                `SELECT date FROM interactions 
                 WHERE user_id = (SELECT id FROM users WHERE is_ai_employee = TRUE LIMIT 1)
                 ORDER BY date DESC LIMIT 1`
            );
            if (recentInteraction.length) {
                const lastCall = new Date(recentInteraction[0].date);
                const minutesAgo = Math.floor((Date.now() - lastCall.getTime()) / 60000);
                if (minutesAgo < 60) {
                    checks.push({ name: 'Worker Daemon', status: 'ok', message: `Last activity: ${minutesAgo}m ago` });
                } else {
                    checks.push({ name: 'Worker Daemon', status: 'warn', message: `Last activity: ${minutesAgo}m ago`, detail: 'The background worker may not be running. Start it: cd apps/worker && npm run dev' });
                }
            } else {
                checks.push({ name: 'Worker Daemon', status: 'warn', message: 'No recent AI call activity found', detail: 'The pacing engine has not placed any calls yet.' });
            }
        } catch {
            checks.push({ name: 'Worker Daemon', status: 'warn', message: 'Could not query worker activity' });
        }

        const errorCount = checks.filter(c => c.status === 'error').length;
        const warnCount = checks.filter(c => c.status === 'warn').length;
        const okCount = checks.filter(c => c.status === 'ok').length;

        let overallStatus: 'connected' | 'degraded' | 'disconnected' = 'connected';
        if (errorCount > 0) overallStatus = 'disconnected';
        else if (warnCount > 0) overallStatus = 'degraded';

        res.json({
            success: true,
            data: {
                overallStatus,
                connected: overallStatus === 'connected',
                summary: {
                    ok: okCount,
                    warnings: warnCount,
                    errors: errorCount,
                    total: checks.length
                },
                checks,
                checkedAt: new Date().toISOString()
            }
        });
    } catch (err: any) {
        logger.error(`[AIEmployeeRoutes] GET /${req.params.id}/health failed: ${err.message}`);
        res.status(500).json({ error: 'Health check failed', message: err.message });
    }
});

export default router;

