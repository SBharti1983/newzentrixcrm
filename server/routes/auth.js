const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

function signTokens(user) {
    const payload = {
        id: user.id, tenantId: user.tenant_id,
        role: user.role, name: user.name, email: user.email, avatar: user.avatar,
        telephony_agent_id: user.telephony_agent_id,
        features: user.settings?.features || {},
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    });
    return { accessToken, refreshToken };
}

// ── GET /api/auth/tenant/:slug ─────────────────────────────────────
// Public route to fetch tenant branding details for the login page
router.get('/tenant/:slug', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT name, slug, logo_url, primary_color, is_active FROM tenants WHERE slug = $1`,
            [req.params.slug]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
        if (!rows[0].is_active) return res.status(403).json({ error: 'Tenant account is inactive' });
        
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tenant info' });
    }
});

// ── POST /api/auth/register ───────────────────────────────────────
// Self-registration: creates a new tenant + admin user (14-day trial)
router.post('/register', async (req, res) => {
    const { company_name, name, email, password, phone, subdomain } = req.body;
    
    // Validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required' });
    }
    // Auto-generate workspace name if company not provided
    const workspaceName = (company_name || '').trim() || `${name.trim()}'s Workspace`;
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (subdomain) {
        const freeDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 
            'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com'
        ];
        const domain = email.split('@')[1]?.toLowerCase();
        if (freeDomains.includes(domain)) {
            return res.status(400).json({ error: 'Personal email addresses are not allowed. Please use your company email.' });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if email already exists globally
        const existCheck = await client.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]
        );
        if (existCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
        }

        // Generate a unique slug from workspace name
        const baseSlug = workspaceName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Check slug uniqueness, append random suffix if needed
        let slug = baseSlug || 'workspace';
        const slugCheck = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) {
            slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // Create the tenant with a 14-day trial plan
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 14);

        const tenantRes = await client.query(
            `INSERT INTO tenants (name, slug, primary_color, plan, plan_expires_at, max_users, max_leads, max_projects, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [workspaceName, slug, '#1e3a73', 'trial', trialExpiry, 3, 500, 5, true]
        );
        const tenant = tenantRes.rows[0];

        // Hash password and create the admin user
        const passwordHash = await bcrypt.hash(password, 12);
        const userRes = await client.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, phone, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [tenant.id, name.trim(), email.trim().toLowerCase(), passwordHash, phone || null, 'admin', true]
        );
        const user = userRes.rows[0];

        await client.query('COMMIT');

        // Auto-login: generate JWT tokens
        const { accessToken, refreshToken } = signTokens({ ...user, tenant_id: tenant.id });

        // Store refresh token
        const refreshHash = await bcrypt.hash(refreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [user.id, refreshHash, expiresAt]
        );

        console.log(`[AUTH] New workspace registered: "${company_name}" (${slug}) by ${email}`);

        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, avatar: user.avatar,
                telephony_agent_id: user.telephony_agent_id,
                tenantId: tenant.id, tenantName: tenant.name,
                tenantSlug: tenant.slug, plan: tenant.plan,
            },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[AUTH] Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    } finally {
        client.release();
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', async (req, res) => {
    if (!req.body) return res.status(400).json({ error: 'Request body is missing' });
    let { email, password, subdomain } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    email = email.trim();
    try {
        console.log(`[AUTH] Login attempt for: "${email}" (subdomain: ${subdomain})`);
        
        let query = `
            SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.plan, t.settings, t.is_active as tenant_is_active 
            FROM users u 
            LEFT JOIN tenants t ON u.tenant_id = t.id 
            WHERE LOWER(u.email) = LOWER($1)
        `;
        const params = [email];

        if (subdomain) {
            query += ` AND t.slug = $2`;
            params.push(subdomain);
        }

        const { rows } = await pool.query(query, params);
        const user = rows[0];
        
        if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.tenant_id && user.tenant_is_active === false) {
            console.log(`[AUTH] Login failed: Tenant INACTIVE for ${email}`);
            return res.status(401).json({ error: 'Subscription inactive.' });
        }
        if (user.tenant_id && user.tenant_is_active === null) {
            console.log(`[AUTH] Login failed: Tenant record MISSING for user ${email}`);
            return res.status(401).json({ error: 'System configuration error. Please contact support.' });
        }
        
        // Disallow cross-tenant logins if a specific subdomain is requested
        if (subdomain && user.tenant_slug && user.tenant_slug !== subdomain) {
            console.log(`[AUTH] Login failed: User ${email} (tenant: ${user.tenant_slug}) attempted to log into subdomain: ${subdomain}`);
            return res.status(403).json({ error: `This account does not belong to the '${subdomain}' workspace.` });
        }

        if (!user.is_active) {
             console.log(`[AUTH] Login failed: User account DISABLED for ${email}`);
             return res.status(401).json({ error: 'Account disabled.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        console.log(`[AUTH] Password match for ${email}: ${valid}`);

        if (!valid) {
            console.log(`[AUTH] Invalid password for: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // --- Robust Database Interaction with Retries ---
        const runQuery = async (query, params, maxRetries = 3) => {
            let lastErr;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    return await pool.query(query, params);
                } catch (err) {
                    lastErr = err;
                    const isTimeout = err.message.includes('timeout') || err.code === 'ETIMEDOUT' || err.message.includes('terminated');
                    const isDNS = err.code === 'ENOTFOUND';
                    
                    if (isTimeout || isDNS) {
                        console.warn(`[AUTH] DB retry ${i + 1}/${maxRetries} due to: ${err.message}`);
                        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential-ish backoff
                        continue;
                    }
                    throw err; // Not a retryable error
                }
            }
            throw lastErr;
        };

        // Update last login
        try {
            await runQuery(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);
        } catch (dbErr) {
            console.error('[AUTH] Failed to update last_login_at:', dbErr.message);
            // Non-critical, continue
        }

        const { accessToken, refreshToken } = signTokens(user);
        console.log(`[AUTH] Tokens generated for ${email}`);

        // Store refresh token hash
        try {
            const refreshHash = await bcrypt.hash(refreshToken, 8);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await runQuery(
                `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
                [user.id, refreshHash, expiresAt]
            );
            console.log(`[AUTH] Refresh token stored for ${email}`);
        } catch (rfErr) {
            console.error('[AUTH] Refresh token storage failed:', rfErr.message);
            // Critical failure for session persistence
            return res.status(500).json({ 
                error: 'Login failed on server side', 
                message: 'Database connection unstable. Please try again in 5 seconds.',
                technical: rfErr.message
            });
        }

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, avatar: user.avatar,
                telephony_agent_id: user.telephony_agent_id,
                tenantId: user.tenant_id, tenantName: user.tenant_name,
                tenantSlug: user.tenant_slug, plan: user.plan,
                features: user.settings?.features || {},
            },
        });
    } catch (err) {
        console.error('[AUTH] Login CRITICAL error:', err);
        res.status(500).json({ 
            error: 'Login failed on server side', 
            details: err.message,
            code: err.code, // Useful for DB errors
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
            `SELECT u.id, u.name, u.email, u.role, u.avatar, u.phone, u.department, u.last_login_at, u.telephony_agent_id,
                    t.name as tenant_name, t.slug, t.plan, t.primary_color, t.settings
             FROM users u JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = $1`, [req.user.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        const user = rows[0];
        res.json({
            ...user,
            features: user.settings?.features || {}
        });
    } catch (err) {
        console.error('CRITICAL [AUTH] GET /me error:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            stack: err.stack,
            userId: req.user?.id
        });
        res.status(500).json({ 
            error: 'Failed to fetch profile',
            details: err.message,
            code: err.code 
        });
    }
});

module.exports = router;
