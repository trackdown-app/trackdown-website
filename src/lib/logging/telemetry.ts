import "@tanstack/react-start/server-only";
import { context, diag, DiagLogLevel, logs, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor, TracerProvider } from "@opentelemetry/sdk-trace";
import { z } from "zod";
import {
    consoleOutput,
    createLogger,
    installConsoleBridge,
} from "@/lib/logging/logger";
import { privateSpans } from "@/lib/logging/tracing";

export const posthogLogsEndpoint = "https://eu.i.posthog.com/i/v1/logs";
export const posthogTracesEndpoint = "https://eu.i.posthog.com/i/v1/traces";

export type Telemetry = {
    flush(): Promise<void>;
    shutdown(): Promise<void>;
};

declare global {
    var trackdownTelemetry: Telemetry | undefined;
}

/** Checked once at startup. An invalid value is never included in the error. */
export function projectToken(env: NodeJS.ProcessEnv): string | undefined {
    const value = env["POSTHOG_PROJECT_TOKEN"]?.trim();
    if (value == null || value === "") {
        if (env["VERCEL"] === "1")
            throw new Error("POSTHOG_PROJECT_TOKEN is required on Vercel");
        return undefined;
    }
    if (
        !z
            .string()
            .regex(/^phc_[A-Za-z0-9]+$/)
            .safeParse(value).success
    ) {
        throw new Error("POSTHOG_PROJECT_TOKEN must be a PostHog project token");
    }
    return value;
}

/** Global state is shared by Nitro's plugin and the separately bundled SSR entry. */
export function startTelemetry(): Telemetry {
    if (globalThis.trackdownTelemetry != null) return globalThis.trackdownTelemetry;
    const token = projectToken(process.env);
    installConsoleBridge();
    const log = createLogger("server");
    if (token == null) {
        globalThis.trackdownTelemetry = {
            flush: () => Promise.resolve(),
            shutdown: () => Promise.resolve(),
        };
        log.info("Server started; console only");
        return globalThis.trackdownTelemetry;
    }
    // Diagnostics bypass the bridge and discard SDK arguments: exporter
    // errors can hold credentials, a URL or a rejected payload.
    function diagnostic() {
        consoleOutput().warn(
            "[telemetry] Export or SDK warning; details suppressed",
        );
    }
    diag.setLogger(
        {
            error: diagnostic,
            warn: diagnostic,
            info: diagnostic,
            debug: diagnostic,
            verbose: diagnostic,
        },
        DiagLogLevel.WARN,
    );
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    const resource = resourceFromAttributes({
        "service.name": "trackdown-website",
        "deployment.environment": process.env["VERCEL_ENV"] ?? "development",
        ...(process.env["VERCEL_GIT_COMMIT_SHA"] == null
            ? {}
            : { "service.version": process.env["VERCEL_GIT_COMMIT_SHA"] }),
        ...(process.env["VERCEL"] === "1"
            ? {
                  "cloud.provider": "vercel",
                  "cloud.region": process.env["VERCEL_REGION"] ?? "fra1",
              }
            : {}),
    });
    const headers = { Authorization: `Bearer ${token}` };
    const loggerProvider = new LoggerProvider({
        resource,
        processors: [
            new BatchLogRecordProcessor({
                exporter: new OTLPLogExporter({
                    url: posthogLogsEndpoint,
                    headers,
                    timeoutMillis: 5000,
                }),
            }),
        ],
    });
    logs.setGlobalLoggerProvider(loggerProvider);
    const tracerProvider = new TracerProvider({
        resource,
        spanLimits: {
            attributeValueLengthLimit: 8192,
            attributeCountLimit: 128,
            eventCountLimit: 128,
        },
        spanProcessors: [
            privateSpans(
                new BatchSpanProcessor({
                    exporter: new OTLPTraceExporter({
                        url: posthogTracesEndpoint,
                        headers,
                        timeoutMillis: 5000,
                    }),
                }),
            ),
        ],
    });
    trace.setGlobalTracerProvider(tracerProvider);
    const instrumentation = new UndiciInstrumentation({
        requireParentforSpans: true,
    });
    instrumentation.setTracerProvider(tracerProvider);
    globalThis.trackdownTelemetry = {
        flush: async () => {
            await Promise.all([
                loggerProvider.forceFlush(),
                tracerProvider.forceFlush(),
            ]);
        },
        shutdown: async () => {
            instrumentation.disable();
            await Promise.all([
                loggerProvider.shutdown(),
                tracerProvider.shutdown(),
            ]);
        },
    };
    log.info("Server started");
    return globalThis.trackdownTelemetry;
}

export async function flushTelemetry(): Promise<void> {
    try {
        await globalThis.trackdownTelemetry?.flush();
    } catch {
        // Console only: do not create another record for an exporter failure.
        consoleOutput().warn("[telemetry] Export failed; details suppressed");
    }
}
