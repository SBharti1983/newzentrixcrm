const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail, sendReferralAlert } = require('../services/notifier');

/**
 * Public Onboarding & Self-Provisioning
 */

// POST /api/onboarding/signup
router.post('/signup', async (req, res) => {
    const { name, email, password, phone, referral_code } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 0. Check Referral if provided
        let referrerId = null;
        if (referral_code) {
            const { rows: [ref] } = await client.query('SELECT id FROM tenants WHERE referral_code = $1', [referral_code]);
            if (ref) referrerId = ref.id;
        }

        // 1. Generate Slug (firstname)
        const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');
        let slug = firstName;
        
        // Ensure uniqueness
        const { rows: existing } = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (existing.length > 0) {
            slug = `${firstName}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // 2. Create Tenant (Default Solo Plan)
        const { rows: [tenant] } = await client.query(`
            INSERT INTO tenants (name, slug, plan, max_users, max_leads, is_active)
            VALUES ($1, $2, 'pro_solo', 1, 1000, true)
            RETURNING *
        `, [`${name}'s Workspace`, slug]);

        // 3. Create Admin User for this tenant
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows: [user] } = await client.query(`
            INSERT INTO users (tenant_id, name, email, password, role, is_active)
            VALUES ($1, $2, $3, $4, 'admin', true)
            RETURNING id, name, email, role
        `, [tenant.id, name, email, hashedPassword]);

        // 4. Record Referral
        if (referrerId) {
            await client.query(`
                INSERT INTO referrals (referrer_id, referee_id, status)
                VALUES ($1, $2, 'pending')
            `, [referrerId, tenant.id]);
        }

        await client.query('COMMIT');

        // 5. Outbound Transactions
        await sendWelcomeEmail(user, tenant);
        if (referrerId) {
            const { rows: [ref] } = await pool.query('SELECT name FROM users WHERE tenant_id = $1 AND role = \'admin\'', [referrerId]);
            await sendReferralAlert(ref?.name || 'Partner', user.name);
        }

        // Record Audit
        await pool.query(
            'INSERT INTO audit_logs (action, target_id, details) VALUES ($1, $2, $3)',
            ['self_signup', tenant.id, { name, email, slug, referral_code }]
        );

        res.status(201).json({
            success: true,
            message: 'Workspace provisioned successfully',
            workspace: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                url: `https://${tenant.slug}.zentrixcrm.com`
            },
            user
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ONBOARDING] Signup failed:', err);
        res.status(500).json({ error: 'Failed to provision your workspace. Please try again later.' });
    } finally {
        client.release();
    }
});

// GET /api/onboarding/tenant-identity
router.get('/tenant-identity', async (req, res) => {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug is required' });

    try {
        const { rows: [tenant] } = await pool.query(
            'SELECT name, logo_url, primary_color FROM tenants WHERE slug = $1 AND is_active = true',
            [slug]
        );

        if (!tenant) return res.status(404).json({ error: 'Workspace not found' });
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch node identity' });
    }
});

module.exports = router;
