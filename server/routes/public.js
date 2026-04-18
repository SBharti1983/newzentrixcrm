const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

async function getTenantByHostname(hostname) {
    let tenant;
    const parts = hostname.split('.');
    const isZentrixSubdomain = (hostname.includes('zentrixcrm.com') || hostname.includes('localhost')) && parts.length >= 3;

    if (isZentrixSubdomain) {
        const slug = parts[0] === 'www' ? parts[1] : parts[0];
        const { rows } = await pool.query(
            "SELECT name, settings, logo_url, primary_color FROM tenants WHERE slug = $1",
            [slug]
        );
        tenant = rows[0];
    } else {
        const { rows } = await pool.query(
            "SELECT name, settings, logo_url, primary_color FROM tenants WHERE settings->>'custom_domain' = $1 LIMIT 1",
            [hostname]
        );
        tenant = rows[0];
    }
    return tenant;
}

// GET /api/public/branding?hostname=...
router.get('/branding', async (req, res) => {
    try {
        const { hostname } = req.query;
        if (!hostname) return res.status(400).json({ error: 'Hostname required' });

        const tenant = await getTenantByHostname(hostname);

        if (!tenant) {
            return res.json({ is_default: true, company_name: 'Zentrix CRM' });
        }

        const settings = tenant.settings || {};
        res.json({
            company_name: tenant.name,
            logo_url: tenant.logo_url || settings.logo_url || '',
            primary_color: tenant.primary_color || settings.primary_color || '#6366f1',
            tagline: settings.tagline || 'Real Estate Intelligence Platform',
            favicon_url: settings.favicon_url || '',
            login_banner_text: settings.login_banner_text || '',
            pwa_enabled: settings.pwa_enabled !== false,
            is_default: false
        });

    } catch (err) {
        console.error('[PUBLIC BRANDING] Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/public/manifest.json?hostname=...
router.get('/manifest.json', async (req, res) => {
    try {
        const { hostname } = req.query;
        if (!hostname) return res.status(400).json({ error: 'Hostname required' });

        const tenant = await getTenantByHostname(hostname);
        const settings = tenant?.settings || {};

        if (settings.pwa_enabled === false) {
            return res.status(404).json({ error: 'PWA disabled for this tenant' });
        }

        const name = tenant?.name || 'Zentrix CRM';
        const primaryColor = tenant?.primary_color || settings.primary_color || '#6366f1';

        const manifest = {
            short_name: name,
            name: `${name} | Agent Pro`,
            description: settings.tagline || 'Real Estate Intelligence Platform',
            icons: [
                {
                    src: settings.favicon_url || '/vite.svg',
                    sizes: '64x64 32x32 24x24 16x16',
                    type: 'image/x-icon'
                },
                {
                    src: '/logo192.png',
                    type: 'image/png',
                    sizes: '192x192',
                    purpose: 'any maskable'
                },
                {
                    src: '/logo512.png',
                    type: 'image/png',
                    sizes: '512x512',
                    purpose: 'any'
                }
            ],
            start_url: '/',
            display: 'standalone',
            theme_color: primaryColor,
            background_color: '#0a1628',
            orientation: 'portrait'
        };

        res.set('Content-Type', 'application/manifest+json');
        res.json(manifest);
    } catch (err) {
        console.error('[PUBLIC MANIFEST] Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
