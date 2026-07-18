import { trace, context, Span, SpanOptions, Tracer } from '@opentelemetry/api';

export class Tracing {
    private static tracerName = 'digital-employee-tracer';

    private static getTracer(): Tracer {
        return trace.getTracer(this.tracerName);
    }

    static startSpan(name: string, options?: SpanOptions): Span {
        return this.getTracer().startSpan(name, options);
    }

    static async traceActiveSpan<T>(
        name: string,
        fn: (span: Span) => Promise<T>,
        options?: SpanOptions
    ): Promise<T> {
        return this.getTracer().startActiveSpan(name, options || {}, async (span) => {
            try {
                const result = await fn(span);
                span.setStatus({ code: 1 }); // 1 = SpanStatusCode.OK
                return result;
            } catch (error: any) {
                span.setStatus({
                    code: 2, // 2 = SpanStatusCode.ERROR
                    message: error?.message || 'Error occurred during execution'
                });
                span.recordException(error);
                throw error;
            } finally {
                span.end();
            }
        });
    }
}
