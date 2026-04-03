const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;          // { id, tenantId, role, name, email }

        // --- GLOBAL OVERRIDE FOR SUPERADMIN ACCESS ---
        // Ensure Rohan and any authorized superadmin email maps correctly
        if (req.user.email === 'rohan.mishra@zentrixcrm.com' || req.user.role === 'Super Admin' || req.user.role === 'super admin') {
            req.user.role = 'superadmin';
        }

        req.tenantId = payload.tenantId;
        next();
    } catch (_err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
