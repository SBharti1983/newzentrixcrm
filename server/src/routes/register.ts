import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';

const router = express.Router();

/**
 * /api/auth/register — Public tenant + admin user registration
 * Creates a new tenant (company) and the first admin user.
 */

// POST /api/auth/register
router.post('/', async (req: Request, res: Response) => {
    const { company_name, name, email, password, phone } = req.body;

    // Validation
    if (!company_name || !name || !email || !password) {
        return res.status(400).json({ error: 'Company name, name, email, and password are required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if email already exists
        const { rows: existing } = await client.query(
            `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]
        );
        if (existing.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Create slug from company name
        const slug = company_name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50);

        // Check slug uniqueness
        const { rows: slugCheck } = await client.query(
            `SELECT id FROM tenants WHERE slug = $1`, [slug]
        );
        const uniqueSlug = slugCheck.length ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

        // Create tenant
        const { rows: [tenant] } = await client.query(
            `INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects)
             VALUES ($1, $2, 'trial', 3, 500, 5) RETURNING *`,
            [company_name, uniqueSlug]
        );

        // Create admin user
        const hash = await bcrypt.hash(password, 12);
        const avatar = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        const { rows: [user] } = await client.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, phone, avatar)
             VALUES ($1, $2, $3, $4, 'admin', $5, $6) RETURNING id, name, email, role, avatar`,
            [tenant.id, name, email, hash, phone || null, avatar]
        );

        await client.query('COMMIT');

        // Sign tokens
        const payload = {
            id: user.id, tenantId: tenant.id,
            role: user.role, name: user.name, email: user.email, avatar: user.avatar,
        };
        const accessToken = jwt.sign(payload, (process.env.JWT_SECRET as string) || 'secret', {
            expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
        });
        const refreshToken = jwt.sign({ id: user.id }, (process.env.REFRESH_TOKEN_SECRET as string) || 'secret', {
            expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN as any) || '30d',
        });

        // Store refresh token
        const refreshHash = await bcrypt.hash(refreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
            [user.id, refreshHash, expiresAt]
        );

        res.status(201).json({
            message: 'Account created successfully!',
            accessToken,
            refreshToken,
            user: {
                id: user.id, name: user.name, email: user.email,
                role: user.role, avatar: user.avatar,
                tenantId: tenant.id, tenantName: tenant.name,
                tenantSlug: tenant.slug, plan: tenant.plan,
            },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    } finally {
        client.release();
    }
});

export default router;
