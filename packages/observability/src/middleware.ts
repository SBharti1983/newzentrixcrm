/**
 * Express Request Tracing Middleware
 * 
 * Auto-creates tracing spans for incoming HTTP requests.
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';

const tracer = trace.getTracer('zentrix-http-tracer');

export function expressTelemetryMiddleware(req: Request, res: Response, next: NextFunction) {
    const route = req.route ? req.route.path : req.path;
    const spanName = `HTTP ${req.method} ${route}`;

    const span = tracer.startSpan(spanName, {
        attributes: {
            'http.method': req.method,
            'http.url': req.url,
            'http.route': route,
            'http.user_agent': req.headers['user-agent']
        }
    });

    res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode);
        if (res.statusCode >= 400) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `Request failed with status ${res.statusCode}`
            });
        } else {
            span.setStatus({ code: SpanStatusCode.OK });
        }
        span.end();
    });

    next();
}
