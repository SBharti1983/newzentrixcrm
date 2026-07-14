/**
 * Input validation & sanitization middleware
 * Uses express-validator for common patterns
 */
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to check validation results and return errors
export function validate(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map((e: any) => ({
                field: e.path,
                message: e.msg,
            })),
        });
    }
    next();
}

// ─── Common validation chains ─────────────────────────────────────

export const sanitizeString = (field: string) =>
    body(field).optional().trim().escape();

export const requireString = (field: string, label: string) =>
    body(field).notEmpty().withMessage(`${label} is required`).trim();

export const optionalEmail = () =>
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email').normalizeEmail();

export const requireEmail = () =>
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail();

export const optionalPhone = () =>
    body('phone').optional({ values: 'falsy' }).trim()
        .matches(/^[\d\s+()-]{7,20}$/).withMessage('Invalid phone number');

export const requirePhone = () =>
    body('phone').notEmpty().withMessage('Phone is required').trim()
        .matches(/^[\d\s+()-]{7,20}$/).withMessage('Invalid phone number');

export const requirePassword = () =>
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters');

export const uuidParam = (field = 'id') =>
    param(field).isUUID().withMessage(`Invalid ${field}`);

export const paginationQuery = () => [
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
];

// ─── Route-specific validation sets ───────────────────────────────

export const validateLead = [
    requireString('name', 'Name'),
    requirePhone(),
    optionalEmail(),
    sanitizeString('city'),
    sanitizeString('source'),
    sanitizeString('notes'),
    validate as any,
];

export const validateBooking = [
    body('customer_id').notEmpty().isUUID().withMessage('Valid customer ID required'),
    body('project_id').notEmpty().isUUID().withMessage('Valid project ID required'),
    body('total_amount').optional().isDecimal().withMessage('Amount must be a number'),
    validate as any,
];

export const validateUser = [
    requireString('name', 'Name'),
    requireEmail(),
    requirePassword(),
    body('role').optional().isIn(['admin', 'sales_manager', 'agent']).withMessage('Invalid role'),
    validate as any,
];

export const validateProject = [
    requireString('name', 'Project name'),
    sanitizeString('location'),
    sanitizeString('description'),
    body('total_units').optional().isInt({ min: 0 }).withMessage('Units must be >= 0'),
    validate as any,
];
