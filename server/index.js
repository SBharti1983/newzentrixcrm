const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// ZentrixCRM Main Entry Point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const automationService = require('./services/automationService');

const isProduction = process.env.NODE_ENV === 'production';
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
        socket.user = decoded;
        next();
    });
});

// In-memory store for presence
const presence = {
    users: new Map(),
    tenantViewers: {}
};

io.on('connection', (socket) => {
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

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/public', require('./routes/public'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/auth/register', require('./routes/register'));
app.use('/api/auth', require('./routes/passwordReset'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/site-visits', require('./routes/siteVisits'));
app.use('/api/channel-partners', require('./routes/channelPartners'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/telephony', require('./routes/telephony'));
app.use('/api/copilot', require('./routes/copilot'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/zapier', require('./routes/zapier'));
app.use('/api/automation', require('./routes/automation'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/search', require('./routes/search'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/broker', require('./routes/broker'));

app.get('/', (req, res) => { res.json({ message: 'ZentrixCRM API Running', health: '/api/health' }); });

app.get('/api/health', async (req, res) => {
    const pool = require('./db/pool');
    try {
        const { rows } = await pool.query('SELECT NOW() as time');
        res.json({ status: 'ok', time: rows[0].time });
    } catch { res.status(503).json({ status: 'db_error' }); }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`ZentrixCRM API Cluster Ready on Port ${PORT}`);
    automationService.startBackgroundWorker(io);
    
    // Start 30-day recording retention auto-cleanup
    const { startRetentionScheduler } = require('./services/recordingRetention');
    startRetentionScheduler();
});

