const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

function signTokens(user) {
    const payload = {
        id: user.id, tenantId: user.tenant_id,
        role: user.role, name: user.name, email: user.email, avatar: user.avatar,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    });
    return { accessToken, refreshToken };
}

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    try {
        // Simplified query to diagnose the root cause
        const { rows } = await pool.query(
            `SELECT u.* FROM users u WHERE LOWER(u.email) = LOWER($1)`, [email]
        );
        const user = rows[0];
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Now check tenant status separately to be precise
        const { rows: tenantRows } = await pool.query(
            `SELECT is_active FROM tenants WHERE id = $1`, [user.tenant_id]
        );
        const tenant = tenantRows[0];
        if (!tenant) {
            console.log(`[AUTH] Login failed: Tenant record MISSING for user ${email} (Dangling ID: ${user.tenant_id})`);
            return res.status(401).json({ error: 'System configuration error. Please contact support.' });
        }
        if (!tenant.is_active) {
            console.log(`[AUTH] Login failed: Tenant INACTIVE for ${email}`);
            return res.status(401).json({ error: 'Subscription inactive.' });
        }
        if (!user.is_active) {
             console.log(`[AUTH] Login failed: User account DISABLED for ${email}`);
             return res.status(401).json({ error: 'Account disabled.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

        const { accessToken, refreshToken } = signTokens(user);

        // Store refresh token hash
        const refreshHash = await bcrypt.hash(refreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
            [user.id, refreshHash, expiresAt]
        );

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, avatar: user.avatar,
                tenantId: user.tenant_id, tenantName: user.tenant_name,
                tenantSlug: user.tenant_slug, plan: user.plan,
            },
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({ 
            error: 'Login failed on server side', 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    }
});

// ── POST /api/auth/refresh ────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    try {
        const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const { rows } = await pool.query(
            `SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [payload.id]
        );
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'User not found' });

        // Validate refresh token exists in DB
        const { rows: tokenRows } = await pool.query(
            `SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()`, [payload.id]
        );
        let tokenValid = false;
        for (const row of tokenRows) {
            if (await bcrypt.compare(refreshToken, row.token_hash)) {
                tokenValid = true;
                // Delete the used token (rotation)
                await pool.query(`DELETE FROM refresh_tokens WHERE id = $1`, [row.id]);
                break;
            }
        }
        if (!tokenValid) return res.status(401).json({ error: 'Refresh token revoked or expired' });

        const { accessToken, refreshToken: newRefresh } = signTokens(user);

        // Store new refresh token
        const refreshHash = await bcrypt.hash(newRefresh, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
            [user.id, refreshHash, expiresAt]
        );

        res.json({ accessToken, refreshToken: newRefresh });
    } catch {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// ── POST /api/auth/logout ─────────────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            // Verify and find the token owner
            const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            // Delete all refresh tokens for this user (force re-login everywhere)
            await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [payload.id]);
        }
    } catch { /* token may be expired, still proceed with logout */ }
    res.json({ message: 'Logged out successfully' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.avatar, u.phone, u.department, u.last_login_at,
                    t.name as tenant_name, t.slug, t.plan, t.primary_color
             FROM users u JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = $1`, [req.user.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
