/**
 * Winston Telemetry Logger Correlation
 * 
 * Intercepts Winston log events and injects active OTel traceId/spanId contexts.
 */

import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

// Winston format formatter to correlation traces
const otelFormat = winston.format((info) => {
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        info.traceId = spanContext.traceId;
        info.spanId = spanContext.spanId;
    }
    return info;
});

export function createTelemetryLogger(serviceName: string) {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            otelFormat(),
            winston.format.timestamp(),
            winston.format.json()
        ),
        defaultMeta: { service: serviceName },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ]
    });
}
