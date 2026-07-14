/**
 * Audit Logging Service
 * Tracks all sensitive operations: login, data changes, admin actions.
 * Stores logs in the database for compliance and debugging.
 */
import pool from '../db/pool';
import { Request, Response, NextFunction } from 'express';

// Create audit_logs table if it doesn't exist
export async function initAuditTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Ensure all columns exist individually to handle schema evolution
    const columns = [
      ['tenant_id', 'UUID'],
      ['user_id', 'UUID'],
      ['user_email', 'VARCHAR(255)'],
      ['resource', 'VARCHAR(100)'],
      ['resource_id', 'VARCHAR(50)'],
      ['details', 'JSONB DEFAULT \'{}\''],
      ['ip_address', 'VARCHAR(45)'],
      ['user_agent', 'TEXT']
    ];

    for (const [name, type] of columns) {
      try {
        await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      } catch (e) { /* ignore */ }
    }

    // Now create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `);

    console.log('✅ Audit logging initialized');
  } catch (err) {
    console.error('[AUDIT] Table creation failed:', err.message);
  }
}

/**
 * Log an audit event
 * @param {Object} event
 * @param {string} event.action - e.g. 'LOGIN', 'CREATE_LEAD', 'UPDATE_USER', 'DELETE_LEAD'
 * @param {string} event.resource - e.g. 'leads', 'users', 'settings'
 * @param {string|number} event.resourceId - ID of affected resource
 * @param {Object} event.details - Additional context (changed fields, old values, etc.)
 * @param {Object} req - Express request object (for user info, IP, etc.)
 */
export async function logAudit(event: any, req: Request | any = null) {
  try {
    const {
      action,
      resource = null,
      resourceId = null,
      details = {},
      tenantId = null,
      userId = null,
      userEmail = null
    } = event;

    // Extract user info from request if available
    const tenant = tenantId || req?.user?.tenantId || null;
    const user = userId || req?.user?.id || null;
    const email = userEmail || req?.user?.email || null;
    const ip = req?.ip || req?.connection?.remoteAddress || null;
    const ua = req?.get?.('user-agent') || null;

    await pool.query(
      `INSERT INTO audit_logs (tenant_id, user_id, user_email, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [tenant, user, email, action, resource, String(resourceId), JSON.stringify(details), ip, ua]
    );
  } catch (err) {
    // Never let audit logging crash the app
    console.error('[AUDIT] Log failed:', err.message);
  }
}

// Pre-defined audit actions for consistency
export const ACTIONS = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  TOKEN_REFRESH: 'TOKEN_REFRESH',

  // Leads
  CREATE_LEAD: 'CREATE_LEAD',
  UPDATE_LEAD: 'UPDATE_LEAD',
  DELETE_LEAD: 'DELETE_LEAD',
  IMPORT_LEADS: 'IMPORT_LEADS',
  ASSIGN_LEAD: 'ASSIGN_LEAD',
  TRANSFER_LEAD: 'TRANSFER_LEAD',

  // Users
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  ROLE_CHANGE: 'ROLE_CHANGE',

  // Settings
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_BRANDING: 'UPDATE_BRANDING',

  // Admin
  EXPORT_DATA: 'EXPORT_DATA',
  BULK_ACTION: 'BULK_ACTION',
  API_KEY_CREATED: 'API_KEY_CREATED',
};

/**
 * Express middleware: auto-log write operations
 */
export function auditMiddleware(req: Request | any, res: Response, next: NextFunction) {
  // Only audit write operations
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  
  // Capture the original json method to log after response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // Only log successful write operations
    if (res.statusCode < 400 && req.user) {
      const action = `${req.method}_${req.path.split('/')[2]?.toUpperCase() || 'UNKNOWN'}`;
      logAudit({
        action,
        resource: req.path.split('/')[2] || 'unknown',
        resourceId: req.params?.id || data?.id || null,
        details: { method: req.method, path: req.path, statusCode: res.statusCode }
      }, req);
    }
    return originalJson(data);
  };
  
  next();
}

