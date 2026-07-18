/**
 * OpenTelemetry SDK Initializer
 * 
 * Sets up tracing, instrumentation, and exporter targets.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

let sdk: NodeSDK | null = null;

export function initializeTelemetry(serviceName: string) {
    if (sdk) return;

    console.log(`[Telemetry] Initializing telemetry tracing for "${serviceName}"...`);

    sdk = new NodeSDK({
        resource: new Resource({
            [ATTR_SERVICE_NAME]: serviceName
        }),
        spanProcessors: [
            // Lightweight span processor routing traces to stdout in dev
            new SimpleSpanProcessor(new ConsoleSpanExporter())
        ]
    });

    sdk.start();
    console.log(`[Telemetry] Telemetry SDK started for "${serviceName}" successfully.`);
}

export function shutdownTelemetry() {
    if (sdk) {
        sdk.shutdown()
            .then(() => console.log('[Telemetry] Telemetry SDK shut down.'))
            .catch((err) => console.error('[Telemetry] Error shutting down Telemetry SDK:', err));
    }
}
