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

        // --- STRICT SUPERADMIN ACCESS ---
        const SUPER_ADMIN_EMAILS = ['rohan.mishra@zentrixcrm.com', 'arjun@zentrix.com'];
        if (SUPER_ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
            req.user.role = 'superadmin';
        }

        req.tenantId = payload.tenantId;
        next();
    } catch (_err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
