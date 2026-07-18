/**
 * Deprecation Warning Middleware for older REST API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@zentrix/logger';

// Mock prometheus counter metrics (incremented on deprecations)
export let deprecatedRequestsCount = 0;

export function deprecationMiddleware(req: Request, res: Response, next: NextFunction) {
    // Append Warning header according to RFC 7234 (Warning: 299 - "Miscellaneous persistent warning")
    res.setHeader('Warning', '299 - "Legacy endpoint format is deprecated and will be removed on 2026-12-31. Please migrate to /api/v1/*"');
    
    // Increment telemetry counters
    deprecatedRequestsCount++;
    logger.warn(`[API Deprecation] Client accessed deprecated endpoint: ${req.method} ${req.originalUrl} (Count: ${deprecatedRequestsCount})`);
    
    next();
}
