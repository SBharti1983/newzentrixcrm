import './env';
import path from 'path';
import dotenv from 'dotenv';

// ─── Sentry MUST be initialized before everything else ───
import { initSentry, Sentry } from './config/sentry';
import pool from './db/pool';
import redis from './db/redis';
import { startRetentionScheduler } from './modules/telephony/recordings/RecordingRetentionService';

// ZentrixCRM Main Entry Point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import automationService from './modules/automation/workflows/AutomationService';

const isProduction = process.env.NODE_ENV === 'production';
const app = express();
// ─── Initialize Sentry ───
initSentry(app);

import http from 'http';
const server = http.createServer(app);

// Essential for Rate Limiting behind proxies (Railway, Heroku, etc)
app.set('trust proxy', 1);

import { loggerContextMiddleware, requestLoggerMiddleware } from './middleware/loggerMiddleware';
import { logger } from './utils/logger';

// ─── Observability & Request Context Middleware ───
app.use(loggerContextMiddleware);
app.use(requestLoggerMiddleware);
import { Server } from 'socket.io';

// Extend Express Request type to include socket.io
declare global {
    namespace Express {
        interface Request {
            io: Server;
            user?: any;
        }
    }
}
import jwt from 'jsonwebtoken';

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            const allowed = [
                process.env.FRONTEND_URL || 'http://localhost:5174',
                'https://zentrix-crm-india.vercel.app',
                'http://localhost:5173',
                'http://localhost:3000'
            ];
            if (allowed.includes(origin) ||
                /^https:\/\/(.*\.)?zentrixcrm\.com$/.test(origin) ||
                /^http:\/\/(.*\.)?localhost(:\d+)?$/.test(origin) ||
                /^http:\/\/10\.122\.82\.250(:\d+)?$/.test(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"]
    }
});

import { setupSocketAdapter } from './utils/socketAdapter';
setupSocketAdapter(io);

// Attach socket.io to req object so routes can broadcast
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET environment variable is not set!');
        return next(new Error('Server misconfiguration'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        (socket as any).user = decoded;
        next();
    });
});

// In-memory store for presence
const presence = {
    users: new Map(),
    tenantViewers: {}
};

// Redis presence helpers
const setRedisPresence = async (tenantId: string, userId: string, data: any) => {
    if (redis.client && redis.client.isReady) {
        try {
            await redis.client.hSet(`tenant:${tenantId}:presence`, userId, JSON.stringify(data));
        } catch (err) {
            console.error('[Redis Presence Error hSet]', err);
        }
    }
};

const delRedisPresence = async (tenantId: string, userId: string) => {
    if (redis.client && redis.client.isReady) {
        try {
            await redis.client.hDel(`tenant:${tenantId}:presence`, userId);
        } catch (err) {
            console.error('[Redis Presence Error hDel]', err);
        }
    }
};

const getTenantPresence = async (tenantId: string) => {
    if (redis.client && redis.client.isReady) {
        try {
            const data = await redis.client.hGetAll(`tenant:${tenantId}:presence`);
            const onlineUsers: any[] = [];
            const viewers: Record<string, any[]> = {};
            if (data) {
                for (const [uid, val] of Object.entries(data)) {
                    try {
                        const parsed = JSON.parse(val);
                        onlineUsers.push(parsed.user);
                        if (parsed.currentPath) {
                            if (!viewers[parsed.currentPath]) viewers[parsed.currentPath] = [];
                            viewers[parsed.currentPath].push(parsed.user);
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
            return { onlineUsers, viewers };
        } catch (err) {
            console.error('[Redis Presence Error hGetAll]', err);
        }
    }
    // Fallback to in-memory presence
    const onlineUsers = Array.from(presence.users.values())
        .filter(u => u.tenantId === tenantId)
        .map(u => u.user);
    const viewers: Record<string, any[]> = {};
    presence.users.forEach((data) => {
        if (data.currentPath && data.tenantId === tenantId) {
            if (!viewers[data.currentPath]) viewers[data.currentPath] = [];
            viewers[data.currentPath].push(data.user);
        }
    });
    return { onlineUsers, viewers };
};

io.on('connection', (socket: any) => {
    const { tenantId, id: user_id, name, avatar } = socket.user;
    socket.join(`tenant_${tenantId}`);
    socket.join(`user_${user_id}`);

    presence.users.set(user_id, {
        socketId: socket.id,
        user: { id: user_id, name, avatar },
        tenantId: tenantId,
        currentPath: null
    });

    const broadcastPresence = async () => {
        try {
            const { onlineUsers, viewers } = await getTenantPresence(tenantId);
            io.to(`tenant_${tenantId}`).emit('presence_update', { onlineUsers, viewers });
        } catch (err) {
            console.error('[Presence Broadcast Error]', err);
        }
    };

    // Initialize presence in background
    setRedisPresence(tenantId, user_id, {
        user: { id: user_id, name, avatar },
        currentPath: null
    }).then(() => broadcastPresence());

    socket.on('page_view', ({ path }) => {
        const userData = presence.users.get(user_id);
        if (userData) {
            userData.currentPath = path;
        }
        setRedisPresence(tenantId, user_id, {
            user: { id: user_id, name, avatar },
            currentPath: path
        }).then(() => broadcastPresence());
    });

    socket.on('disconnect', async () => {
        presence.users.delete(user_id);

        try {
            // Check if there are any remaining sockets for this user across all cluster instances
            const remainingSockets = await io.in(`user_${user_id}`).fetchSockets();
            if (remainingSockets.length === 0) {
                // No other tabs/connections from this user remain, so remove from Redis presence
                await delRedisPresence(tenantId, user_id);
            }
        } catch (err) {
            console.error('[Disconnect Presence Error]', err);
        }

        await broadcastPresence();
    });

    // --- Academy Dual Roleplay Events ---
    socket.on('academy_battle_invite', ({ toUserId, scenarioId }) => {
        const target = presence.users.get(toUserId);
        if (target) {
            io.to(target.socketId).emit('academy_battle_challenge', {
                fromUser: { id: user_id, name, avatar },
                scenarioId
            });
        }
    });

    socket.on('academy_battle_accept', ({ challengerId, scenarioId }) => {
        const challenger = presence.users.get(challengerId);
        if (challenger) {
            const roomName = `battle_${challengerId}_${user_id}`;
            socket.join(roomName);
            // We need to tell the challenger to join too
            io.to(challenger.socketId).emit('academy_battle_join_room', { roomName, partnerId: user_id, role: 'seller' });
            socket.emit('academy_battle_join_room', { roomName, partnerId: challengerId, role: 'buyer' });

            // Notify both to start
            setTimeout(() => {
                io.to(roomName).emit('academy_battle_start', { scenarioId });
            }, 1000);
        }
    });

    socket.on('academy_battle_sync', ({ roomName, message }) => {
        // Broadcast to everyone in the room except the sender
        socket.to(roomName).emit('academy_battle_sync', { message });
    });

    socket.on('academy_battle_end', ({ roomName }) => {
        io.to(roomName).emit('academy_battle_end');
    });
});

// ─── Security & Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = [
            process.env.FRONTEND_URL || 'http://localhost:5174',
            'https://zentrix-crm-india.vercel.app',
            'http://localhost:5173',
            'http://localhost:3000',
            'https://zentrixcrm.com',
            'https://www.zentrixcrm.com',
            'https://api.zentrixcrm.com',
            'https://admin.zentrixcrm.com'
        ];
        if (allowed.includes(origin) ||
            /^https:\/\/(.*\.)?zentrixcrm\.com$/.test(origin) ||
            /^https:\/\/(.*\.)?vercel\.app$/.test(origin) ||
            /^http:\/\/(.*\.)?localhost(:\d+)?$/.test(origin) ||
            /^http:\/\/10\.122\.82\.250(:\d+)?$/.test(origin) ||
            !origin // Allow non-browser requests/tools
        ) {
            callback(null, true);
        } else {
            console.error(`[CORS REJECTED] Origin: ${origin}`);
            callback(new Error(`CORS Error: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

import { deprecationMiddleware } from './middleware/deprecation';
import { globalLimiter, authLimiter } from './middleware/rateLimiter';
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', globalLimiter);

// ─── Security: Input Sanitization ────────────────────────────────
import { sanitizeMiddleware } from './middleware/sanitize';
// app.use(sanitizeMiddleware);

// ─── Audit Logging ───────────────────────────────────────────────
import { auditMiddleware, initAuditTable } from './modules/system/auditService';
// app.use(auditMiddleware);
initAuditTable(); // Create audit_logs table if needed

// ─── Route Imports ───────────────────────────────────────────────
import publicRoutes from './modules/system/public.routes';
import authRoutes from './modules/auth/AuthRoutes';
import onboardingRoutes from './modules/auth/OnboardingRoutes';
import registerRoutes from './modules/auth/RegisterRoutes';
import passwordResetRoutes from './modules/auth/PasswordResetRoutes';
import dashboardRoutes from './modules/system/dashboard.routes';
import leadsRoutes from './modules/leads/lead/LeadRoutes';
import templatesRoutes from './modules/system/templates.routes';
import projectsRoutes from './modules/properties/project/ProjectRoutes';
import bookingsRoutes from './modules/properties/booking/BookingRoutes';
import followupsRoutes from './modules/leads/followup/FollowupRoutes';
import enquiriesRoutes from './modules/leads/enquiry/EnquiryRoutes';
import customersRoutes from './modules/leads/lead/CustomerRoutes';
import siteVisitsRoutes from './modules/leads/site-visit/SiteVisitRoutes';
import channelPartnersRoutes from './modules/marketing/ChannelPartnerRoutes';
import referralsRoutes from './modules/marketing/ReferralRoutes';
import commissionsRoutes from './modules/marketing/CommissionRoutes';
import analyticsRoutes from './modules/analytics/AnalyticsRoutes';
import usersRoutes from './modules/system/users.routes';
import documentsRoutes from './modules/system/documents.routes';
import notificationsRoutes from './modules/system/notifications.routes';
import telephonyRouter from './modules/telephony';
import outboundRoutes from './modules/telephony/outbound/OutboundRoutes';
import copilotRoutes from './modules/ai/assistant/CopilotRoutes';
import superadminRoutes from './modules/system/superadmin.routes';
import billingRoutes from './modules/billing/BillingRoutes';
import automationsRoutes from './modules/automation/workflows/AutomationsRoutes';
import zapierRoutes from './modules/automation/zapier/ZapierRoutes';
import automationRoutes from './modules/automation/workflows/AutomationRoutes';
import integrationsRoutes from './modules/system/integrations.routes';
import marketingRoutes from './modules/marketing/MarketingRoutes';
import webhooksRoutes from './modules/system/webhooks.routes';
import searchRoutes from './modules/system/search.routes';
import settingsRoutes from './modules/system/settings.routes';
import aiRoutes from './modules/ai/orchestration/AiRoutes';
import brokerRoutes from './modules/marketing/BrokerRoutes';
import academyRoutes from './modules/academy/AcademyRoutes';
import systemNotificationsRoutes from './modules/system/systemNotifications.routes';
import rohanDashboardRoutes from './modules/ai/dashboard/RohanDashboardRoutes';
import aiEmployeeRoutes from './modules/ai/dashboard/AIEmployeeRoutes';
import nehaEventRoutes from './modules/ai/nehaBridge/NehaEventRoutes';
import nehaDashboardRoutes from './modules/ai/dashboard/NehaDashboardRoutes';

// ─── Route Registration ─────────────────────────────────────────
const v1Router = express.Router();

v1Router.use('/public', publicRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/onboarding', onboardingRoutes);
v1Router.use('/auth/register', registerRoutes);
v1Router.use('/auth', passwordResetRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/leads', leadsRoutes);
v1Router.use('/templates', templatesRoutes);
v1Router.use('/projects', projectsRoutes);
v1Router.use('/bookings', bookingsRoutes);
v1Router.use('/followups', followupsRoutes);
v1Router.use('/enquiries', enquiriesRoutes);
v1Router.use('/customers', customersRoutes);
v1Router.use('/site-visits', siteVisitsRoutes);
v1Router.use('/channel-partners', channelPartnersRoutes);
v1Router.use('/referrals', referralsRoutes);
v1Router.use('/commissions', commissionsRoutes);
v1Router.use('/analytics', analyticsRoutes);
v1Router.use('/users', usersRoutes);
v1Router.use('/documents', documentsRoutes);
v1Router.use('/notifications', notificationsRoutes);
v1Router.use('/telephony', telephonyRouter);
v1Router.use('/calls', outboundRoutes);
v1Router.use('/copilot', copilotRoutes);
v1Router.use('/superadmin', superadminRoutes);
v1Router.use('/billing', billingRoutes);
v1Router.use('/automations', automationsRoutes);
v1Router.use('/zapier', zapierRoutes);
v1Router.use('/automation', automationRoutes);
v1Router.use('/integrations', integrationsRoutes);
v1Router.use('/marketing', marketingRoutes);
v1Router.use('/webhooks', webhooksRoutes);
v1Router.use('/search', searchRoutes);
v1Router.use('/settings', settingsRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/broker', brokerRoutes);
v1Router.use('/academy', academyRoutes);
v1Router.use('/system-notifications', systemNotificationsRoutes);
v1Router.use('/ai/dashboard', rohanDashboardRoutes);
v1Router.use('/ai/employees', aiEmployeeRoutes);
v1Router.use('/neha/events', nehaEventRoutes);
v1Router.use('/neha/dashboard', nehaDashboardRoutes);

// Mount versioned routing tables
app.use('/api/v1', v1Router);

// Backwards compatibility fallback for older clients (warns them)
app.use('/api', deprecationMiddleware, v1Router);

// ─── Swagger API Documentation ───────────────────────────────────
import { setupSwagger } from './config/swagger';
setupSwagger(app);

app.get('/', (req, res) => { res.json({ message: 'ZentrixCRM API Running', health: '/api/health', docs: '/api/docs' }); });

app.get('/api/health', async (req, res) => {
    const health: {
        status: string;
        services: { db: boolean; redis: boolean };
        environment: string;
        timestamp: string;
        db_error?: string;
        redis_error?: string;
    } = {
        status: 'ok',
        services: { db: false, redis: false },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    };

    try {
        await pool.query('SELECT 1');
        health.services.db = true;
    } catch (e) {
        health.status = 'partial_error';
        health.db_error = e.message;
    }

    try {
        // Only try to ping if the client exists and is connected
        if (redis.client && redis.client.isReady) {
            await redis.client.ping();
            health.services.redis = true;
        }
    } catch (e) {
        health.status = 'partial_error';
        health.redis_error = e.message;
    }

    const statusCode = (health.services.db) ? 200 : 503;
    res.status(statusCode).json(health);
});

// ─── Diagnostic Error Buffer ─────────────────────────────────────
const errorBuffer: any[] = [];
app.get('/api/diag/logs', (req, res) => {
    res.json(errorBuffer.slice(-20));
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Global Error Handler with Sentry ────────────────────────────
app.use((err, req, res, _next) => {
    const errorDetails = {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    };
    errorBuffer.push(errorDetails);

    // Report to Sentry if available
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(err);
    }
    console.error('[GLOBAL ERROR]', errorDetails);
    res.status(500).json({ error: 'Server error', details: isProduction ? undefined : err.message });
});

// ─── Initialize Sentry ───────────────────────────────────────────
// initSentry(app); // Already initialized at top

const PORT = process.env.PORT || 4000;
server.listen(PORT as number, '0.0.0.0', () => {
    logger.info(`ZentrixCRM API Cluster Ready on Port ${PORT}`);
    logger.info(`📖 API Docs: http://localhost:${PORT}/api/docs`);
    automationService.startBackgroundWorker(io);

    // Start 30-day recording retention auto-cleanup
    startRetentionScheduler();
});

// Prevent Node.js from crashing entirely on unhandled stream errors (e.g. pg ECONNRESET)
process.on('uncaughtException', (err: any) => {
    logger.error(`🔥 [FATAL] Uncaught Exception: ${err.message}`, { stack: err.stack });
    if (err.code === 'ECONNRESET' || err.message?.includes('ECONNRESET')) {
        logger.warn('⚠️ Suppressed ECONNRESET network error (database connection drop).');
        return;
    }
    // For other errors, it's safer to exit, but we'll try to keep the server alive in dev
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
