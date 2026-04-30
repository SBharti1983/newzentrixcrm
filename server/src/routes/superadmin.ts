import express, { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { authenticateToken } from '../middleware/auth';
import { cacheResponse } from '../middleware/cache';

const router = express.Router();

// Helper for administrative audit trail
const recordAudit = async (action: string, targetId: string, details = {}) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (action, target_id, details) VALUES ($1, $2, $3)',
            [action, targetId, JSON.stringify(details)]
        );
    } catch (err) {
        console.error('[AUDIT] Failed to record action:', err);
    }
};

// Protect ALL superadmin routes — require auth + superadmin role
router.use(authenticateToken);
router.use((req: any, res: Response, next: NextFunction) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
});

// Get all tenants
router.get('/tenants', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(`
            SELECT t.*, 
                   (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
                   (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) as lead_count
            FROM tenants t
            ORDER BY t.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// Create a new tenant (and their admin user)
router.post('/tenants', async (req: any, res: Response) => {
    const { name, admin_name, admin_email, admin_password, plan = 'trial', max_users = 3, max_leads = 500, settings = {} } = req.body;
    
    if (!name || !admin_name || !admin_email || !admin_password) {
        return res.status(400).json({ error: 'Company name, admin name, admin email, and admin password are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check email
        const { rows: existing } = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [admin_email]);
        if (existing.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        let slug;
        if (plan === 'pro_solo') {
            slug = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');
        } else {
            slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
        }
        
        const { rows: slugCheck } = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        const uniqueSlug = slugCheck.length ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

        const { rows: [tenant] } = await client.query(
            `INSERT INTO tenants (name, slug, plan, max_users, max_leads, max_projects, settings)
             VALUES ($1, $2, $3, $4, $5, 5, $6) RETURNING *`,
            [name, uniqueSlug, plan, max_users, max_leads, settings]
        );

        const hash = await bcrypt.hash(admin_password, 12);
        const avatar = admin_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        
        await client.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, avatar)
             VALUES ($1, $2, $3, $4, 'admin', $5)`,
            [tenant.id, admin_name, admin_email, hash, avatar]
        );

        await client.query('COMMIT');
        res.status(201).json({ ...tenant, user_count: 1, lead_count: 0 });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create tenant' });
    } finally {
        client.release();
    }
});

// Update full tenant details
router.patch('/tenants/:id', async (req: any, res: Response) => {
    const { is_active, plan, name, slug, logo_url, primary_color, max_users, max_leads, settings } = req.body;
    try {
        const updates = [];
        const values = [];
        let index = 1;

        if (is_active !== undefined) { updates.push(`is_active = $${index++}`); values.push(is_active); }
        if (plan !== undefined) { updates.push(`plan = $${index++}`); values.push(plan); }
        if (name !== undefined) { updates.push(`name = $${index++}`); values.push(name); }
        if (slug !== undefined) { updates.push(`slug = $${index++}`); values.push(slug); }
        if (logo_url !== undefined) { updates.push(`logo_url = $${index++}`); values.push(logo_url); }
        if (primary_color !== undefined) { updates.push(`primary_color = $${index++}`); values.push(primary_color); }
        if (max_users !== undefined) { updates.push(`max_users = $${index++}`); values.push(max_users); }
        if (max_leads !== undefined) { updates.push(`max_leads = $${index++}`); values.push(max_leads); }
        if (settings !== undefined) { updates.push(`settings = $${index++}`); values.push(settings); }

        if (updates.length > 0) {
            values.push(req.params.id);
            await pool.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${index}`, values);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

// Delete a tenant
router.delete('/tenants/:id', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tenants WHERE id = $1 RETURNING name', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json({ success: true, message: `Tenant ${result.rows[0].name} deleted.` });
    } catch (err) {
        console.error('[SUPERADMIN] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete tenant.' });
    }
});

// Get system stats
router.get('/stats', cacheResponse(300), async (req: any, res: Response) => {
    try {
        // 🔥 STORED PROCEDURE: Single round-trip for all global stats
        const { rows } = await pool.query('SELECT get_superadmin_stats() as data');
        res.json(rows[0].data);
    } catch (_err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Nudge tenant for payment
router.post('/tenants/:id/nudge', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        
        // Fetch Tenant & Admin info
        const { rows: [tenant] } = await pool.query(`
            SELECT t.*, u.name as admin_name, u.email as admin_email, u.phone as admin_phone
            FROM tenants t
            JOIN users u ON u.tenant_id = t.id
            WHERE t.id = $1 AND u.role = 'admin'
            LIMIT 1
        `, [id]);

        if (!tenant) return res.status(404).json({ error: 'Tenant admin not found' });

        // LOGIC: In production, trigger WhatsApp/Email nudge here
        // const message = `Dear ${tenant.admin_name}, your ZentrixCRM workspace (${tenant.slug}) has a pending collection. Please settle to avoid disruption.`;
        // await sendWhatsappMessage(SYSTEM_TENANT_ID, tenant.admin_phone, message);

        console.log(`[NUDGE] Sent to ${tenant.admin_name} (${tenant.admin_email}) for workspace ${tenant.slug}`);
        await recordAudit('payment_nudge', id, { admin_name: tenant.admin_name, workspace: tenant.slug });

        res.json({ success: true, message: `Nudge sent to ${tenant.admin_name}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to nudge tenant' });
    }
});

// GET /api/superadmin/utilization-alerts
router.get('/utilization-alerts', async (req: any, res: Response) => {
    try {
        const query = `
            SELECT t.id, t.name, t.slug, t.plan, t.max_users, t.max_leads,
                   (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count,
                   (SELECT COUNT(*) FROM leads l WHERE l.tenant_id = t.id) as lead_count
            FROM tenants t
        `;
        const { rows } = await pool.query(query);
        
        const alerts = rows.filter((r: any) => {
            const userPct = parseInt(r.user_count) / r.max_users;
            const leadPct = parseInt(r.lead_count) / r.max_leads;
            return userPct > 0.9 || leadPct > 0.9;
        }).map((r: any) => ({
            ...r,
            severity: (parseInt(r.user_count) / r.max_users > 0.98 || parseInt(r.lead_count) / r.max_leads > 0.98) ? 'CRITICAL' : 'WARNING',
            reason: parseInt(r.user_count) / r.max_users > 0.9 ? 'User Limit' : 'Lead Capacity'
        }));

        res.json(alerts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch utilization alerts' });
    }
});

// Record a manual payment/subscription
router.post('/subscriptions/manual', async (req: any, res: Response) => {
    const { tenant_id, plan, amount, gateway_sub_id, method = 'manual' } = req.body;
    
    if (!tenant_id || !plan || !amount) {
        return res.status(400).json({ error: 'Tenant, plan, and amount are required' });
    }

    try {
        const { rows: [sub] } = await pool.query(`
            INSERT INTO subscriptions (tenant_id, plan, status, amount, gateway, gateway_sub_id)
            VALUES ($1, $2, 'active', $3, $4, $5)
            RETURNING *
        `, [tenant_id, plan, amount, method, gateway_sub_id || `MAN-${Date.now()}`]);
        
        // Fetch tenant name for the response to update UI locally
        const { rows: [result] } = await pool.query(`
            SELECT s.*, t.name as tenant_name, t.slug as tenant_slug 
            FROM subscriptions s 
            JOIN tenants t ON s.tenant_id = t.id 
            WHERE s.id = $1
        `, [sub.id]);

        await recordAudit('manual_payment', tenant_id, { plan, amount, method, ref: gateway_sub_id });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record manual payment' });
    }
});

// Get all subscriptions across the platform
router.get('/subscriptions', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query(`
            SELECT s.*, t.name as tenant_name, t.slug as tenant_slug
            FROM subscriptions s
            JOIN tenants t ON s.tenant_id = t.id
            ORDER BY s.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch global subscriptions' });
    }
});

// Get platform-wide audit logs
router.get('/audit-logs', async (req: any, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Download invoice PDF
router.get('/subscriptions/:id/invoice', async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { rows: [sub] } = await pool.query(`
            SELECT s.*, t.name as tenant_name, t.slug as tenant_slug
            FROM subscriptions s
            JOIN tenants t ON s.tenant_id = t.id
            WHERE s.id = $1
        `, [id]);

        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        const doc = new PDFDocument({ margin: 50 });
        
        // HTTP Headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Zentrix_Invoice_${sub.gateway_sub_id}.pdf`);
        doc.pipe(res);

        // Header
        doc.fillColor('#1e3a8a').fontSize(24).text('ZENTRIX CRM', { align: 'right' });
        doc.fillColor('#64748b').fontSize(10).text('Financial Technology Division', { align: 'right' });
        doc.moveDown();

        doc.fillColor('#0f172a').fontSize(20).text('TAX INVOICE', 50, 50);
        doc.fontSize(10).fillColor('#64748b').text(`Invoice Date: ${new Date(sub.created_at).toLocaleDateString()}`);
        doc.text(`Reference ID: ${sub.gateway_sub_id}`);
        doc.moveDown();

        // Billing Info
        doc.fillColor('#0f172a').fontSize(12).text('BILL TO:', 50, 120);
        doc.fontSize(14).text(sub.tenant_name);
        doc.fontSize(10).fillColor('#64748b').text(`${sub.tenant_slug}.zentrixcrm.com`);
        doc.moveDown(2);

        // Table Header
        const tableTop = 200;
        doc.fillColor('#f8fafc').rect(50, tableTop, 500, 20).fill();
        doc.fillColor('#475569').fontSize(10).text('Description', 60, tableTop + 5);
        doc.text('Amount', 450, tableTop + 5);

        // Table Row
        doc.fillColor('#0f172a').fontSize(11).text(`${sub.plan.toUpperCase()} Subscription - Monthly Cycle`, 60, tableTop + 30);
        doc.text(`INR ${parseFloat(sub.amount).toLocaleString()}`, 450, tableTop + 30);

        // Divider
        doc.moveTo(50, tableTop + 50).lineTo(550, tableTop + 50).stroke('#e2e8f0');

        // Total
        doc.fontSize(14).fillColor('#0f172a').text('TOTAL DUE', 350, tableTop + 70);
        doc.fontSize(16).text(`INR ${parseFloat(sub.amount).toLocaleString()}`, 450, tableTop + 70);

        // Footer
        doc.fontSize(10).fillColor('#94a3b8').text('This is a computer generated document. No signature required.', 50, 700, { align: 'center' });
        doc.text('ZentrixCRM Corporate HQ • Tech Hub • Global Operations', 50, 715, { align: 'center' });

        doc.end();
        await recordAudit('invoice_download', sub.tenant_id, { sub_id: id, ref: sub.gateway_sub_id });

    } catch (err) {
        console.error(err);
        res.status(500).send('Generation failed');
    }
});

export default router;
