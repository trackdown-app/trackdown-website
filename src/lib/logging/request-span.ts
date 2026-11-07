import {
    ROOT_CONTEXT,
    SpanKind,
    SpanStatusCode,
    context,
    trace,
} from "@opentelemetry/api";
import { waitUntil } from "@vercel/functions";
import { errorAttributes } from "@/lib/logging/attributes";
import type { TelemetryAttributes } from "@/lib/logging/attributes";
import { createLogger } from "@/lib/logging/logger";
import { requestAttributes } from "@/lib/logging/request-metadata";
import { flushTelemetry } from "@/lib/logging/telemetry";

const log = createLogger("http");

/**
 * A fresh trace for each request. Untrusted traceparent headers are ignored.
 * The span measures time to headers; flushing waits for the streamed body,
 * so late SSR loaders are exported too. waitUntil keeps Vercel alive for it.
 */
export function traceRequest(
    request: Request,
    work: () => Promise<Response>,
): Promise<Response> {
    const attributes = requestAttributes(request);
    return trace
        .getTracer("trackdown-website")
        .startActiveSpan(
            `${attributes["http.request.method"]} ${attributes["http.route"]}`,
            { kind: SpanKind.SERVER, attributes },
            ROOT_CONTEXT,
            async (span) => {
                const started = performance.now();
                try {
                    const response = await work();
                    const completed: TelemetryAttributes = {
                        ...attributes,
                        "http.response.status_code": response.status,
                        "http.server.request.duration_ms":
                            performance.now() - started,
                        "trackdown.outcome":
                            response.status >= 500
                                ? "error"
                                : response.status >= 400
                                  ? "refused"
                                  : "ok",
                    };
                    span.setAttributes(completed);
                    if (response.status >= 500)
                        span.setStatus({ code: SpanStatusCode.ERROR });
                    if (response.status >= 500)
                        log.error("Request completed", completed);
                    else log.info("Request completed", completed);
                    span.end();
                    return flushAfterBody(response);
                } catch (error) {
                    span.setAttributes(errorAttributes(error));
                    span.setStatus({ code: SpanStatusCode.ERROR });
                    log.error("Request failed", {
                        ...attributes,
                        ...errorAttributes(error),
                    });
                    span.end();
                    waitUntil(flushTelemetry());
                    throw error;
                }
            },
        );
}

/** Observe consumption without buffering or changing the response's bytes. */
function flushAfterBody(response: Response): Response {
    if (response.body == null) {
        waitUntil(flushTelemetry());
        return response;
    }
    const reader = response.body.getReader();
    let finish: (() => void) | undefined;
    const consumed = new Promise<void>((resolve) => {
        finish = resolve;
    });
    // Start the background task now, while the Vercel request context exists.
    // All export failures are contained by flushTelemetry.
    waitUntil(consumed.then(() => context.with(ROOT_CONTEXT, flushTelemetry)));
    const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const chunk = await reader.read();
                if (chunk.done) {
                    controller.close();
                    finish?.();
                } else {
                    controller.enqueue(chunk.value);
                }
            } catch (error) {
                controller.error(error);
                finish?.();
            }
        },
        async cancel(reason: unknown) {
            try {
                await reader.cancel(reason);
            } finally {
                finish?.();
            }
        },
    });
    return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}
