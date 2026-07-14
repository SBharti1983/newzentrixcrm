import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
    req: any;
    traceId: string;
}

// Stores the request context (holds the request object and traceId)
export const requestContextStore = new AsyncLocalStorage<RequestStore>();

/**
 * Winston JSON and Console Formatter.
 * Pulls request-scoped traceId, tenantId, and userId dynamically from AsyncLocalStorage
 * at the moment the log is written, ensuring structured context is always present.
 */
const dynamicContextFormat = winston.format.printf((info) => {
    const store = requestContextStore.getStore();
    const req = store?.req;
    
    // Dynamically retrieve context values from the active request
    const tenantId = req?.user?.tenantId || req?.tenantId || undefined;
    const userId = req?.user?.id || undefined;
    const traceId = store?.traceId || undefined;

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        // Structured JSON log for log aggregators (Datadog, AWS CloudWatch, etc.)
        const logData = {
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            tenantId,
            userId,
            traceId,
            ...(info.metadata && Object.keys(info.metadata).length > 0 ? { metadata: info.metadata } : {}),
        };
        return JSON.stringify(logData);
    } else {
        // Human-friendly console logging with colors in development
        const timestamp = info.timestamp ? `[${info.timestamp}]` : '';
        const level = info.level.toUpperCase();
        const trace = traceId ? ` [Trace: ${traceId.substring(0, 8)}]` : '';
        const tenant = tenantId ? ` [Tenant: ${tenantId.toString().substring(0, 8)}]` : '';
        const user = userId ? ` [User: ${userId.toString().substring(0, 8)}]` : '';
        
        let metaStr = '';
        if (info.metadata && Object.keys(info.metadata).length > 0) {
            metaStr = ` | Meta: ${JSON.stringify(info.metadata)}`;
        }
        
        return `${timestamp} ${level}${trace}${tenant}${user}: ${info.message}${metaStr}`;
    }
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
        dynamicContextFormat
    ),
    transports: [
        new winston.transports.Console()
    ]
});

export default logger;
