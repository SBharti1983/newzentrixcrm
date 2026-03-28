const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const automationService = require('./services/automationService');

const app = express();
const http = require('http');
const server = http.createServer(app);

// Essential for Rate Limiting behind proxies (Railway, Heroku, etc)
app.set('trust proxy', 1);

// Global request logger — THE FIRST MIDDLEWARE
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:5174',
            'http://localhost:5173',
            'http://localhost:3000',
        ],
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
        socket.user = decoded;
        next();
    });
});

// In-memory store for presence (In production, use Redis)
const presence = {
    users: new Map(), // userId -> { socketId, user, currentPath }
    tenantViewers: {} // tenantId -> { [path]: [userIds] }
};

io.on('connection', (socket) => {
    const { tenantId, id: user_id, name, avatar } = socket.user;

    // Join tenant room
    socket.join(`tenant_${tenantId}`);
    
    // Store user presence with tenantId for proper isolation
    presence.users.set(user_id, { 
        socketId: socket.id, 
        user: { id: user_id, name, avatar },
        tenantId: tenantId,
        currentPath: null 
    });

    const broadcastPresence = () => {
        // SECURITY: Only show users from the SAME tenant
        const tenantUsers = Array.from(presence.users.values())
            .filter(u => u.tenantId === tenantId)
            .map(u => u.user);

        // Viewers map filtered by tenant
        const viewers = {};
        presence.users.forEach((data, uid) => {
            if (data.currentPath && data.tenantId === tenantId) {
                if (!viewers[data.currentPath]) viewers[data.currentPath] = [];
                viewers[data.currentPath].push(data.user);
            }
        });

        io.to(`tenant_${tenantId}`).emit('presence_update', { 
            onlineUsers: tenantUsers,
            viewers
        });
    };

    broadcastPresence();

    socket.on('page_view', ({ path }) => {
        const userData = presence.users.get(user_id);
        if (userData) {
            userData.currentPath = path;
            broadcastPresence();
        }
    });

    socket.on('disconnect', () => {
        presence.users.delete(user_id);
        broadcastPresence();
        console.log(`Socket disconnected: User ${user_id}`);
    });
});

// ─── Security & Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:3000',
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiter — 100 requests per 15 min per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Auth routes get a stricter limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth/register', require('./routes/register'));
app.use('/api/auth', require('./routes/passwordReset'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/enquiries', require('./routes/enquiries'));

// Additional stub routes (ready to expand)
app.use('/api/customers', require('./routes/customers'));
app.use('/api/site-visits', require('./routes/siteVisits'));
app.use('/api/channel-partners', require('./routes/channelPartners'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/system-notifications', require('./routes/systemNotifications'));

app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/zapier', require('./routes/zapier'));
app.use('/api/automation', require('./routes/automation'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/webhooks', require('./routes/webhooks'));

// ─── Welcome Message ──────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ 
        message: 'ZentrixCRM API — All Systems Operational', 
        health: '/api/health',
        uptime: process.uptime()
    });
});

// ─── Health check ─────────────────────────────────────────────────
console.log('--- SERVER STATE VERIFIED ---');
app.get('/api/health', async (req, res) => {
    const pool = require('./db/pool');
    try {
        const { rows } = await pool.query('SELECT NOW() as time');
        res.json({
            status: 'ok',
            time: rows[0].time,
            env: process.env.NODE_ENV,
            version: '1.0.0',
        });
    } catch {
        res.status(503).json({ status: 'db_error' });
    }
});

// ─── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log('');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│       ZentrixCRM API Server + WebSockets    │');
    console.log(`│       http://localhost:${actualPort}                  │`);
    console.log(`│       ENV: ${process.env.NODE_ENV || 'development'}                   │`);
    console.log('└─────────────────────────────────────────────┘');
    console.log('');

    // Start background automation workers
    automationService.startBackgroundWorker(io);
});

// ─── Graceful shutdown ────────────────────────────────────────────
const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        const pool = require('./db/pool');
        pool.end().then(() => {
            console.log('DB pool closed.');
            process.exit(0);
        });
    });
    setTimeout(() => process.exit(1), 10000); // Force exit after 10s
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
