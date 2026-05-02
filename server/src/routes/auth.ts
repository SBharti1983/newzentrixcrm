import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

function signTokens(user: any) {
    const payload = {
        id: user.id, tenantId: user.tenant_id,
        role: user.role, name: user.name, email: user.email, avatar: user.avatar,
        telephony_agent_id: user.telephony_agent_id,
        channel_partner_id: user.channel_partner_id,
        features: user.settings?.features || {},
    };
    const accessToken = jwt.sign(payload, (process.env.JWT_SECRET as string) || 'secret', {
        expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
    });
    const refreshToken = jwt.sign({ id: user.id }, (process.env.REFRESH_TOKEN_SECRET as string) || 'secret', {
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN as any) || '30d',
    });
    return { accessToken, refreshToken };
}

// ── GET /api/auth/tenant/:slug ─────────────────────────────────────
// Public route to fetch tenant branding details for the login page
router.get('/tenant/:slug', async (req: Request, res: Response) => {
    try {
        const { rows } = await db.execute(sql`
            SELECT name, slug, logo_url, primary_color, is_active FROM tenants WHERE slug = ${req.params.slug}
        `);
        if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
        if (!(rows[0] as any).is_active) return res.status(403).json({ error: 'Tenant account is inactive' });
        
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tenant info' });
    }
});

// ── POST /api/auth/register ───────────────────────────────────────
// Self-registration: creates a new tenant + admin user (14-day trial)
router.post('/register', async (req: Request, res: Response) => {
    const { company_name, name, email, password, phone, subdomain } = req.body;
    
    // Validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required' });
    }
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

    try {
        // Hash password outside the transaction to avoid holding DB connections
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.transaction(async (tx) => {
            // Check if email already exists globally
            const { rows: existCheck } = await tx.execute(sql`
                SELECT id FROM users WHERE LOWER(email) = LOWER(${email.trim()})
            `);
            if (existCheck.length > 0) {
                throw new Error('DUPLICATE_EMAIL');
            }

            // Generate a unique slug from workspace name
            const baseSlug = workspaceName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            
            let slug = baseSlug || 'workspace';
            const { rows: slugCheck } = await tx.execute(sql`SELECT id FROM tenants WHERE slug = ${slug}`);
            if (slugCheck.length > 0) {
                slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
            }

            // Create the tenant with a 14-day trial plan
            const trialExpiry = new Date();
            trialExpiry.setDate(trialExpiry.getDate() + 14);

            const { rows: tenantRows } = await tx.execute(sql`
                INSERT INTO tenants (name, slug, primary_color, plan, plan_expires_at, max_users, max_leads, max_projects, is_active)
                 VALUES (${workspaceName}, ${slug}, '#1e3a73', 'trial', ${trialExpiry.toISOString()}, 3, 500, 5, true) RETURNING *
            `);
            const tenant = tenantRows[0] as any;

            // Create the admin user
            const { rows: userRows } = await tx.execute(sql`
                INSERT INTO users (tenant_id, name, email, password_hash, phone, role, is_active)
                 VALUES (${tenant.id}, ${name.trim()}, ${email.trim().toLowerCase()}, ${passwordHash}, ${phone || null}, 'admin', true) RETURNING *
            `);
            const user = userRows[0] as any;

            return { tenant, user };
        });

        // Auto-login: generate JWT tokens
        const { accessToken, refreshToken } = signTokens({ ...result.user, tenant_id: result.tenant.id });

        // Store refresh token
        const refreshHash = await bcrypt.hash(refreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await db.execute(sql`
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (${result.user.id}, ${refreshHash}, ${expiresAt.toISOString()})
        `);

        console.log(`[AUTH] New workspace registered: "${company_name}" (${result.tenant.slug}) by ${email}`);

        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: result.user.id, name: result.user.name, email: result.user.email,
                role: result.user.role, avatar: result.user.avatar,
                telephony_agent_id: result.user.telephony_agent_id,
                tenantId: result.tenant.id, tenantName: result.tenant.name,
                tenantSlug: result.tenant.slug, plan: result.tenant.plan,
            },
        });
    } catch (err: any) {
        if (err.message === 'DUPLICATE_EMAIL') {
            return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
        }
        console.error('[AUTH] Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
    if (!req.body) return res.status(400).json({ error: 'Request body is missing' });
    let { email, password, subdomain } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    email = email.trim();
    try {
        console.log(`[AUTH] Login attempt for: "${email}" (subdomain: ${subdomain})`);
        
        let result;
        if (subdomain) {
            result = await db.execute(sql`
                SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.plan, t.settings, t.is_active as tenant_is_active,
                       cp.id as channel_partner_id
                FROM users u 
                LEFT JOIN tenants t ON u.tenant_id = t.id 
                LEFT JOIN channel_partners cp ON u.id = cp.user_id
                WHERE LOWER(u.email) = LOWER(${email}) AND t.slug = ${subdomain}
            `);
        } else {
            result = await db.execute(sql`
                SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.plan, t.settings, t.is_active as tenant_is_active,
                       cp.id as channel_partner_id
                FROM users u 
                LEFT JOIN tenants t ON u.tenant_id = t.id 
                LEFT JOIN channel_partners cp ON u.id = cp.user_id
                WHERE LOWER(u.email) = LOWER(${email})
            `);
        }

        const user = result.rows[0] as any;
        
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

        // Update last login
        try {
            await db.execute(sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`);
        } catch (dbErr: any) {
            console.error('[AUTH] Failed to update last_login_at:', dbErr.message);
        }

        const { accessToken, refreshToken } = signTokens(user);
        console.log(`[AUTH] Tokens generated for ${email}`);

        // Store refresh token hash (non-blocking — login should succeed even if this fails)
        try {
            const refreshHash = await bcrypt.hash(refreshToken, 8);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await db.execute(sql`
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (${user.id}, ${refreshHash}, ${expiresAt.toISOString()})
            `);
        } catch (rfErr: any) {
            // Log but DO NOT block login — the access token is still valid
            console.warn('[AUTH] Refresh token storage failed (non-critical):', rfErr.message);
        }

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, avatar: user.avatar,
                telephony_agent_id: user.telephony_agent_id,
                channelPartnerId: user.channel_partner_id,
                tenantId: user.tenant_id, tenantName: user.tenant_name,
                tenantSlug: user.tenant_slug, plan: user.plan,
                features: user.settings?.features || {},
            },
        });
    } catch (err: any) {
        console.error('[AUTH] Login CRITICAL error:', err);
        res.status(500).json({ 
            error: 'Login failed on server side', 
            details: err.message,
            code: err.code,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    }
});

// ── POST /api/auth/refresh ────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    try {
        const payload: any = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string);
        const { rows } = await db.execute(sql`
            SELECT * FROM users WHERE id = ${payload.id} AND is_active = TRUE
        `);
        const user = rows[0] as any;
        if (!user) return res.status(401).json({ error: 'User not found' });

        // Validate refresh token exists in DB
        const { rows: tokenRows } = await db.execute(sql`
            SELECT * FROM refresh_tokens WHERE user_id = ${payload.id} AND expires_at > NOW()
        `);
        let tokenValid = false;
        for (const row of tokenRows) {
            if (await bcrypt.compare(refreshToken, (row as any).token_hash)) {
                tokenValid = true;
                await db.execute(sql`DELETE FROM refresh_tokens WHERE id = ${(row as any).id}`);
                break;
            }
        }
        if (!tokenValid) return res.status(401).json({ error: 'Refresh token revoked or expired' });

        const { accessToken, refreshToken: newRefresh } = signTokens(user);

        // Store new refresh token
        const refreshHash = await bcrypt.hash(newRefresh, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await db.execute(sql`
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (${user.id}, ${refreshHash}, ${expiresAt.toISOString()})
        `);

        res.json({ accessToken, refreshToken: newRefresh });
    } catch {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// ── POST /api/auth/logout ─────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const payload: any = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string);
            await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${payload.id}`);
        }
    } catch { /* token may be expired, still proceed with logout */ }
    res.json({ message: 'Logged out successfully' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', authenticateToken, async (req: any, res: Response) => {
    try {
        const { rows } = await db.execute(sql`
            SELECT u.id, u.name, u.email, u.role, u.avatar, u.phone, u.department, u.last_login_at, u.telephony_agent_id,
                    t.name as tenant_name, t.slug, t.plan, t.primary_color, t.settings
             FROM users u JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = ${req.user.id}
        `);
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        const user = rows[0] as any;
        res.json({
            ...user,
            features: user.settings?.features || {}
        });
    } catch (err: any) {
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

export default router;
