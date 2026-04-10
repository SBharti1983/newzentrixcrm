const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET /api/settings — get workspace settings including role permissions
router.get('/', async (req, res) => {
    try {
        let targetTenantId = req.tenantId;
        
        // If superadmin has no tenantId, fallback to the first available tenant for management
        if (!targetTenantId && req.user.role === 'superadmin') {
            const firstTenant = await pool.query("SELECT id FROM tenants LIMIT 1");
            targetTenantId = firstTenant.rows[0]?.id;
        }

        if (!targetTenantId) return res.status(404).json({ error: 'Tenant context missing' });

        const { rows } = await pool.query("SELECT settings FROM tenants WHERE id = $1", [targetTenantId]);
        if (!rows[0]) return res.status(404).json({ error: 'Tenant record not found' });
        
        // Default permissions if not set in DB
        const defaultPermissions = {
            superadmin: ['Full System Access', 'Tenant Management', 'Role Management', 'Global Analytics', 'BillingControl'],
            admin: ['View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Manage Users', 'System Settings', 'Delete Records', 'Export Data', 'Billing Access'],
            sales_manager: ['View Dashboard', 'Manage Leads', 'Manage Projects', 'View Analytics', 'Assign Agents', 'Export Data'],
            team_leader: ['View Team Dashboard', 'Manage Team Leads', 'View Analytics', 'Lead Distribution', 'Daily Tracking'],
            agent: ['View Dashboard', 'Manage Own Leads', 'View Projects', 'Schedule Visits', 'Update Bookings'],
        };
        
        const settings = rows[0].settings || {};
        const permissions = settings.role_permissions || defaultPermissions;
        
        if (['admin', 'superadmin'].includes(req.user.role)) {
            // Priority: DB Setting > Environment Variable > Default
            settings.telephony_secret = settings.telephony_secret || process.env.ZAPIER_WEBHOOK_SECRET || 'missing_secret';
            
            // Storage URL is usually generated but can be overridden
            if (!settings.android_storage_url) {
                settings.android_storage_url = `${process.env.VITE_API_URL || 'https://api.zentrixcrm.com/api'}/telephony/upload-recording?token=${settings.telephony_secret}:${targetTenantId}`;
            }
            
            settings.firebase_project_id = settings.firebase_project_id || process.env.FIREBASE_PROJECT_ID || 'Not Configured';
            settings.firebase_database_url = settings.firebase_database_url || process.env.FIREBASE_DATABASE_URL || 'Not Configured';
            
            // Allow Gemini API Key override via DB settings
            settings.gemini_api_key = settings.gemini_api_key || process.env.GEMINI_API_KEY || '';
        }

        res.json({ ...settings, role_permissions: permissions });
    } catch (err) {
        console.error('GET /settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PATCH /api/settings — update workspace settings
router.patch('/', async (req, res) => {
    try {
        // Only admin/superadmin can edit settings
        if (!['admin', 'superadmin'].includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });

        let targetTenantId = req.tenantId;

        // If superadmin has no tenantId, fallback to the first available tenant
        if (!targetTenantId && req.user.role === 'superadmin') {
            const firstTenant = await pool.query("SELECT id FROM tenants LIMIT 1");
            targetTenantId = firstTenant.rows[0]?.id;
        }

        if (!targetTenantId) return res.status(404).json({ error: 'Tenant context missing' });

        const { role_permissions, ...otherSettings } = req.body;
        
        const { rows } = await pool.query("SELECT settings FROM tenants WHERE id = $1", [targetTenantId]);
        const currentSettings = rows[0]?.settings || {};
        
        const updatedSettings = {
            ...currentSettings,
            ...otherSettings,
            role_permissions: role_permissions || currentSettings.role_permissions
        };

        await pool.query("UPDATE tenants SET settings = $1 WHERE id = $2", [updatedSettings, req.tenantId]);
        res.json(updatedSettings);
    } catch (err) {
        console.error('PATCH /settings error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
