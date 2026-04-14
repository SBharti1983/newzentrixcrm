const jwt = require('jsonwebtoken');

module.exports = async function auth(req, res, next) {
    // 1. Support for Static Zapier Token (API Key)
    const zapierToken = req.headers['x-zapier-token'] || req.query.token;
    const authHeader = req.headers.authorization;
    if (zapierToken && process.env.ZAPIER_WEBHOOK_SECRET) {
        const [providedSecret, tenantId] = zapierToken.split(':');
        
        if (providedSecret === process.env.ZAPIER_WEBHOOK_SECRET && tenantId) {
            req.user = { id: 'automated-zapier', role: 'admin', name: 'Zapier Automation', email: 'zapier@zentrix.com', tenantId };
            req.tenantId = tenantId;
            return next();
        }
    }

    // 2. Standard JWT Bearer Auth
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        
        // --- STRICT SUPERADMIN ACCESS ---
        const SUPER_ADMIN_EMAILS = ['rohan.mishra@zentrixcrm.com', 'arjun@zentrix.com'];
        if (SUPER_ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
            req.user.role = 'superadmin';
        }

        // --- TENANT LOCK CHECK ---
        const pool = require('../db/pool');
        const { rows: [tenant] } = await pool.query('SELECT is_active FROM tenants WHERE id = $1', [payload.tenantId]);
        
        if (tenant && !tenant.is_active && req.user.role !== 'superadmin') {
            return res.status(403).json({ 
                error: 'Account Suspended', 
                code: 'ACCOUNT_LOCKED',
                message: 'Your workspace access is currently restricted due to a billing event or administrative suspension.' 
            });
        }

        req.tenantId = payload.tenantId;
        next();
    } catch (_err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
