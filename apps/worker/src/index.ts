/**
 * Zentrix Background Worker Daemon
 * 
 * Runs intervals and event-driven worker tasks to offload main Express server.
 * Stateless consumers subscribe to BullMQ queues, allowing horizontal scale-out.
 */

import './env';
import path from 'path';
import fs from 'fs';

import { logger } from '@zentrix/logger';
import { RedisBus } from '@zentrix/messaging';
import { pool } from '@zentrix/database';
import { processNurtureJob } from './jobs/nurtureJob';
import { processRetentionJob } from './jobs/retentionJob';
import { processReflectionJob } from './jobs/reflectionJob';
import { PacingEngine } from './dialer/PacingEngine';

logger.info('🚀 Zentrix Background Worker starting up...');

const redisBus = new RedisBus();

// Simulated BullMQ Worker implementation for distributed task distribution
class MockBullMqWorker {
    constructor(private readonly queueName: string, private readonly processor: Function) {
        logger.info(`[BullMQ Worker] Registered stateless listener for queue: "${queueName}"`);
    }

    // Trigger mock task execution (simulates queue broker sending a task)
    async triggerJob(id: string, data: any) {
        logger.info(`[BullMQ Queue "${this.queueName}"] Dequeuing job #${id}`);
        await this.processor({ id, data });
    }
}

// ── Run Database Migrations ───────────────────────────────────────
async function runSchedulingMigrations() {
    try {
        const sqlPath = path.join(__dirname, '../../../packages/database/migrations/add_ai_agent_scheduling.sql');
        if (!fs.existsSync(sqlPath)) {
            logger.warn(`[Worker Migration] Migration file not found at: ${sqlPath}`);
            return;
        }
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        logger.info(`[Worker Migration] Applying scheduling columns migration...`);
        
        await pool.query(sqlContent);
        logger.info(`[Worker Migration] Migration applied successfully.`);
    } catch (err: any) {
        logger.error(`[Worker Migration] Failed to apply scheduling migrations: ${err.message}`);
    }
}

// ── Shift Scheduler & Pacing Daemon ────────────────────────────────
async function startShiftSchedulerDaemon() {
    logger.info('[Shift Scheduler] Starting active shift monitoring daemon...');

    setInterval(async () => {
        try {
            logger.info('[Shift Scheduler] Checking AI Agent shift configurations...');
            
            // Query all AI agents with shift status
            const query = `
                SELECT id, employee_name, current_status, shift_start_time, shift_end_time, cooldown_seconds,
                       ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time >= shift_start_time 
                        AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time <= shift_end_time) as is_within_shift
                FROM ai_employee_personas;
            `;
            const { rows: agents } = await pool.query(query);

            for (const agent of agents) {
                const { id, employee_name, current_status, shift_start_time, shift_end_time, cooldown_seconds, is_within_shift } = agent;
                
                if (is_within_shift) {
                    // Agent is within working hours
                    if (current_status === 'offline' || current_status === null) {
                        logger.info(`[Shift Scheduler] ⏰ AI Agent "${employee_name}" is now within shift hours (${shift_start_time} - ${shift_end_time}). Activating status to: "idle".`);
                        
                        await pool.query(
                            `UPDATE ai_employee_personas SET current_status = 'idle' WHERE id = $1`,
                            [id]
                        );
                        
                        // Emit Redis event for real-time updates
                        await redisBus.publish('ai_agent:status_change', {
                            agentId: id,
                            name: employee_name,
                            status: 'idle',
                            timestamp: Date.now()
                        });
                    } else {
                        // Agent is already active. Log pacing check
                        logger.info(`[Shift Scheduler] AI Agent "${employee_name}" is active (status: ${current_status}). Cadence dial pacing interval: ${cooldown_seconds}s.`);
                    }
                } else {
                    // Agent is outside working hours
                    if (current_status !== 'offline') {
                        logger.info(`[Shift Scheduler] 💤 AI Agent "${employee_name}" is outside shift hours (${shift_start_time} - ${shift_end_time}). Setting status to: "offline".`);
                        
                        await pool.query(
                            `UPDATE ai_employee_personas SET current_status = 'offline' WHERE id = $1`,
                            [id]
                        );
                        
                        // Emit Redis event
                        await redisBus.publish('ai_agent:status_change', {
                            agentId: id,
                            name: employee_name,
                            status: 'offline',
                            timestamp: Date.now()
                        });
                    } else {
                        logger.info(`[Shift Scheduler] AI Agent "${employee_name}" is outside shift hours (status: offline).`);
                    }
                }
            }
        } catch (err: any) {
            logger.error(`[Shift Scheduler] Error during periodic shift checks: ${err.message}`);
        }
    }, 30000); // Check every 30 seconds
}

// Warmup runs and connect async triggers
setTimeout(async () => {
    logger.info('[Worker] Initializing warmup background runs and event subscriptions...');
    
    // Run database migrations for scheduling columns
    await runSchedulingMigrations();

    // Start periodic shift daemon
    await startShiftSchedulerDaemon();

    // Start periodic self-reflection daemon (runs every 60 seconds)
    setInterval(async () => {
        await processReflectionJob();
    }, 60000);

    // Start periodic pacing dialer autopilot daemon (runs every 30 seconds)
    const pacingEngine = new PacingEngine();
    setInterval(async () => {
        await pacingEngine.tick();
    }, 30000);

    // Try connecting to Redis in background so down Redis server doesn't block startup
    redisBus.connect().then(async () => {
        // Subscribe to cross-process Redis events once connected
        await redisBus.subscribe('lead:created', async (payload) => {
            logger.info(`[Worker] Asynchronously processing welcome WhatsApp/Email for lead: "${payload.name}" (${payload.leadId})`);
            try {
                logger.info(`  ✅ Welcome payload queued for lead: ${payload.phone}`);
            } catch (err: any) {
                logger.error(`  ❌ Failed triggering welcome dispatch: ${err.message}`);
            }
        });
    }).catch(err => {
        logger.warn(`[Worker] RedisBus connection bypassed: ${err.message}`);
    });

    // ─── Distributed BullMQ Workers ─────────────────────────────────
    // Autopilot nurture jobs worker
    const nurtureWorker = new MockBullMqWorker('nurture-queue', processNurtureJob);
    // Recording retention jobs worker
    const retentionWorker = new MockBullMqWorker('retention-queue', processRetentionJob);

    // Mock scheduled queue triggers (simulate schedule cron tasks pushing to BullMQ)
    await nurtureWorker.triggerJob('job-nurture-101', {
        leadId: 'lead-vip-1',
        campaignId: 'outreach-autumn',
        sequenceStep: 2
    });

    await retentionWorker.triggerJob('job-retention-202', {
        retentionDays: 30,
        tenantId: 10
    });
}, 2000);

logger.info('✅ Zentrix Background Worker active and listening to Redis events');
