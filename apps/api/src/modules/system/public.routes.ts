import express, { Request, Response } from 'express';
import pool from '../../db/pool';
import DistributionService from '../leads/distribution/DistributionService';
import aiService from '../ai/orchestration/AiService';

const router = express.Router();

async function getTenantByHostname(hostname: string) {
    let tenant;
    const parts = hostname.split('.');
    const isZentrixSubdomain = (hostname.includes('zentrixcrm.com') || hostname.includes('localhost')) && parts.length >= 3;

    if (isZentrixSubdomain) {
        const slug = parts[0] === 'www' ? parts[1] : parts[0];
        const { rows } = await pool.query(
            "SELECT id, name, settings, logo_url, primary_color FROM tenants WHERE slug = $1",
            [slug]
        );
        tenant = rows[0];
    } else {
        const { rows } = await pool.query(
            "SELECT id, name, settings, logo_url, primary_color FROM tenants WHERE settings->>'custom_domain' = $1 LIMIT 1",
            [hostname]
        );
        tenant = rows[0];
    }
    return tenant;
}

// GET /api/public/branding?hostname=...
router.get('/branding', async (req: Request, res: Response) => {
    try {
        const { hostname } = req.query;
        if (!hostname) return res.status(400).json({ error: 'Hostname required' });

        const tenant = await getTenantByHostname(hostname as string);

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
router.get('/manifest.json', async (req: Request, res: Response) => {
    try {
        const { hostname } = req.query;
        if (!hostname) return res.status(400).json({ error: 'Hostname required' });

        const tenant = await getTenantByHostname(hostname as string);
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

// GET /api/public/projects/:id — project details for microsite
router.get('/projects/:id', async (req: Request, res: Response) => {
    try {
        const { hostname } = req.query;
        if (!hostname) return res.status(400).json({ error: 'Hostname required' });

        const tenant = await getTenantByHostname(hostname as string);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const { rows: projectRows } = await pool.query(
            "SELECT * FROM projects WHERE id = $1",
            [req.params.id]
        );

        if (!projectRows[0]) return res.status(404).json({ error: 'Project not found' });

        // Also fetch assets (floorplans, etc)
        const { rows: assetRows } = await pool.query(
            "SELECT name, type, file_url FROM documents WHERE project_id = $1 AND status = 'Published'",
            [req.params.id]
        );

        res.json({
            project: projectRows[0],
            assets: assetRows,
            tenant: {
                name: tenant.name,
                logo_url: tenant.logo_url,
                primary_color: tenant.primary_color
            }
        });
    } catch (err) {
        console.error('[PUBLIC PROJECT] Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/public/projects/:id/enquiry — lead submission from microsite
router.post('/projects/:id/enquiry', async (req: Request, res: Response) => {
    try {
        const { hostname, cp, referrer } = req.query;
        const { name, email, phone, message, source } = req.body;

        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

        const tenant = await getTenantByHostname(hostname as string);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        // Resolve Channel Partner if slug or ID provided
        let cpId: string | null = (referrer as string) || null;
        if (cp) {
            const { rows: cpRows } = await pool.query(
                "SELECT id FROM channel_partners WHERE referral_slug = $1 AND tenant_id = $2",
                [cp, tenant.id]
            );
            if (cpRows[0]) cpId = cpRows[0].id;
        }

        // Lead insertion with project and CP attribution
        const { rows: leadRows } = await pool.query(
            `INSERT INTO leads (tenant_id, project_id, channel_partner_id, name, email, phone, source, stage, status)
             VALUES ((SELECT id FROM tenants WHERE slug = $1 OR settings->>'custom_domain' = $2 LIMIT 1), $3, $4, $5, $6, $7, $8, 'New Lead', 'Active')
             RETURNING *`,
            [(hostname as string).split('.')[0], hostname as string, req.params.id, cpId, name, email, phone, source || (cpId ? 'Broker Referral' : 'Public Microsite')]
        );

        // 🔥 AUTOMATED DISTRIBUTION: Assign to best-performing agent
        if (leadRows[0]) {
            await DistributionService.distributeLead(leadRows[0].id as string, req.params.id as string, tenant.id as string);
        }

        res.status(201).json({ success: true, message: 'Enquiry submitted successfully' });
    } catch (err) {
        console.error('[PUBLIC ENQUIRY] Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/public/projects/:id/chat — AI chatbot interaction
router.post('/projects/:id/chat', async (req: Request, res: Response) => {
    try {
        const { hostname, message, history } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const { rows: projectRows } = await pool.query(
            "SELECT * FROM projects WHERE id = $1",
            [req.params.id]
        );

        if (!projectRows[0]) return res.status(404).json({ error: 'Project not found' });

        const project = projectRows[0];

        // Construct System Prompt for Gemini
        const systemPrompt = `
            You are "Zentrix AI", a highly professional and warm sales concierge for a real estate project.
            
            PROJECT CONTEXT:
            Name: ${project.name}
            Location: ${project.location}
            Description: ${project.description}
            Amenities: ${project.amenities || 'Luxury amenities'}
            Property Type: ${project.property_type || 'Residential'}
            
            INSTRUCTIONS:
            1. Answer questions about this project based ONLY on the context provided.
            2. If you don't know something, suggest the user "Enquire Now" to get a call from an expert.
            3. Keep responses concise and focused on selling the benefits of the project.
            4. Tone: Premium, aspirational, and helpful.
            5. Use bullet points for features/amenities.
            6. Encourage the user to register their interest.
        `;

        const response = await aiService.generateChatResponse(systemPrompt, message, history || []);
        res.json({ response });

    } catch (err) {
        console.error('[PUBLIC CHAT] Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
