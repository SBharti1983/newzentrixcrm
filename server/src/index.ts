import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

// ─── Sentry MUST be initialized before everything else ───
import { initSentry, Sentry } from './config/sentry';
import pool from './db/pool';
import redis from './db/redis';
import { startRetentionScheduler } from './services/recordingRetention';

// ZentrixCRM Main Entry Point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import automationService from './services/automationService';

const isProduction = process.env.NODE_ENV === 'production';
const app = express();
import http from 'http';
const server = http.createServer(app);

// Essential for Rate Limiting behind proxies (Railway, Heroku, etc)
app.set('trust proxy', 1);

// Global request logger — THE FIRST MIDDLEWARE
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});
import { Server } from 'socket.io';
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

io.on('connection', (socket: any) => {
    const { tenantId, id: user_id, name, avatar } = socket.user;
    socket.join(`tenant_${tenantId}`);
    
    presence.users.set(user_id, { 
        socketId: socket.id, 
        user: { id: user_id, name, avatar },
        tenantId: tenantId,
        currentPath: null 
    });

    const broadcastPresence = () => {
        const tenantUsers = Array.from(presence.users.values())
            .filter(u => u.tenantId === tenantId)
            .map(u => u.user);
        const viewers = {};
        presence.users.forEach((data, uid) => {
            if (data.currentPath && data.tenantId === tenantId) {
                if (!viewers[data.currentPath]) viewers[data.currentPath] = [];
                viewers[data.currentPath].push(data.user);
            }
        });
        io.to(`tenant_${tenantId}`).emit('presence_update', { onlineUsers: tenantUsers, viewers });
    };

    broadcastPresence();

    socket.on('page_view', ({ path }) => {
        const userData = presence.users.get(user_id);
        if (userData) { userData.currentPath = path; broadcastPresence(); }
    });

    socket.on('disconnect', () => {
        presence.users.delete(user_id);
        broadcastPresence();
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

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5000 });
app.use('/api/', limiter);

// ─── Security: Input Sanitization ────────────────────────────────
import { sanitizeMiddleware } from './middleware/sanitize';
app.use(sanitizeMiddleware);

// ─── Audit Logging ───────────────────────────────────────────────
import { auditMiddleware, initAuditTable } from './services/auditService';
app.use(auditMiddleware);
initAuditTable(); // Create audit_logs table if needed

// ─── Route Imports ───────────────────────────────────────────────
import publicRoutes from './routes/public';
import authRoutes from './routes/auth';
import onboardingRoutes from './routes/onboarding';
import registerRoutes from './routes/register';
import passwordResetRoutes from './routes/passwordReset';
import dashboardRoutes from './routes/dashboard';
import leadsRoutes from './routes/leads';
import templatesRoutes from './routes/templates';
import callsRoutes from './routes/calls';
import projectsRoutes from './routes/projects';
import bookingsRoutes from './routes/bookings';
import followupsRoutes from './routes/followups';
import enquiriesRoutes from './routes/enquiries';
import customersRoutes from './routes/customers';
import siteVisitsRoutes from './routes/siteVisits';
import channelPartnersRoutes from './routes/channelPartners';
import referralsRoutes from './routes/referrals';
import commissionsRoutes from './routes/commissions';
import analyticsRoutes from './routes/analytics';
import usersRoutes from './routes/users';
import documentsRoutes from './routes/documents';
import notificationsRoutes from './routes/notifications';
import telephonyRoutes from './routes/telephony';
import copilotRoutes from './routes/copilot';
import superadminRoutes from './routes/superadmin';
import billingRoutes from './routes/billing';
import automationsRoutes from './routes/automations';
import zapierRoutes from './routes/zapier';
import automationRoutes from './routes/automation';
import integrationsRoutes from './routes/integrations';
import marketingRoutes from './routes/marketing';
import webhooksRoutes from './routes/webhooks';
import searchRoutes from './routes/search';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';
import brokerRoutes from './routes/broker';
import academyRoutes from './routes/academy';
import systemNotificationsRoutes from './routes/systemNotifications';

// ─── Route Registration ─────────────────────────────────────────
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/auth/register', registerRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/site-visits', siteVisitsRoutes);
app.use('/api/channel-partners', channelPartnersRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/telephony', telephonyRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/zapier', zapierRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/system-notifications', systemNotificationsRoutes);

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

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Diagnostic Error Buffer ─────────────────────────────────────
const errorBuffer: any[] = [];
app.get('/api/diag/logs', (req, res) => {
    res.json(errorBuffer.slice(-20));
});

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
initSentry(app);

const PORT = process.env.PORT || 4000;
server.listen(PORT as number, '0.0.0.0', () => {
    console.log(`ZentrixCRM API Cluster Ready on Port ${PORT}`);
    console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
    automationService.startBackgroundWorker(io);
    
    // Start 30-day recording retention auto-cleanup
    startRetentionScheduler();
});

