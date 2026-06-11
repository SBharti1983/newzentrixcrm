import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { requestContextStore } from '../utils/loggerContext';
import logger from '../utils/logger';

/**
 * loggerContextMiddleware:
 * Wraps the execution of all downstream middleware/routes in an AsyncLocalStorage store.
 * Generates a unique traceId per request and makes it available globally.
 */
export function loggerContextMiddleware(req: Request | any, res: Response, next: NextFunction) {
    const traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();
    
    // Pass the traceId back to the client in response headers for ease of debugging
    res.setHeader('x-trace-id', traceId);

    const store = {
        req,
        traceId
    };

    requestContextStore.run(store, () => {
        next();
    });
}

/**
 * requestLoggerMiddleware:
 * Logs incoming HTTP requests and their completion status/latency.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Log incoming request details
    logger.info(`[HTTP] INBOUND: ${req.method} ${req.originalUrl || req.url}`);

    // Capture response completion to log status code and latency
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const level = statusCode >= 500 ? 'error' : (statusCode >= 400 ? 'warn' : 'info');
        
        logger.log(
            level,
            `[HTTP] OUTBOUND: ${req.method} ${req.originalUrl || req.url} - Status: ${statusCode} (${duration}ms)`
        );
    });

    next();
}
