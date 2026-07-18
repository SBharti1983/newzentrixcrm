import { logger as baseLogger } from '@zentrix/logger';
import { trace, context } from '@opentelemetry/api';

export class Logger {
    private static getCorrelation() {
        try {
            const activeSpan = trace.getSpan(context.active());
            if (activeSpan) {
                const spanContext = activeSpan.spanContext();
                return {
                    traceId: spanContext.traceId,
                    spanId: spanContext.spanId,
                };
            }
        } catch {
            // ignore if OTel API context is unavailable or fails
        }
        return {};
    }

    static info(message: string, metadata?: Record<string, any>) {
        baseLogger.info(message, { ...this.getCorrelation(), ...metadata });
    }

    static warn(message: string, metadata?: Record<string, any>) {
        baseLogger.warn(message, { ...this.getCorrelation(), ...metadata });
    }

    static error(message: string, metadata?: Record<string, any>) {
        baseLogger.error(message, { ...this.getCorrelation(), ...metadata });
    }

    static debug(message: string, metadata?: Record<string, any>) {
        baseLogger.debug(message, { ...this.getCorrelation(), ...metadata });
    }
}
