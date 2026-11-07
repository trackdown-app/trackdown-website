import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Span, SpanOptions } from "@opentelemetry/api";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace";
import { errorAttributes, safeAttributes } from "@/lib/logging/attributes";

export function withSpan<T>(
    name: string,
    options: SpanOptions,
    work: (span: Span) => Promise<T>,
): Promise<T> {
    return trace
        .getTracer("trackdown-website")
        .startActiveSpan(name, options, async (span) => {
            try {
                return await work(span);
            } catch (error) {
                span.setAttributes(errorAttributes(error));
                span.setStatus({ code: SpanStatusCode.ERROR });
                throw error;
            } finally {
                span.end();
            }
        });
}

/** Undici records URLs and exception events by default. Strip them before batching. */
export function privateSpans(processor: SpanProcessor): SpanProcessor {
    return {
        onStart: (span, parent) => processor.onStart(span, parent),
        onEnd: (span) => processor.onEnd(privateSpan(span)),
        forceFlush: () => processor.forceFlush(),
        shutdown: () => processor.shutdown(),
    };
}

export function privateSpan(span: ReadableSpan): ReadableSpan {
    return {
        spanContext: () => span.spanContext(),
        ...(span.parentSpanContext == null
            ? {}
            : { parentSpanContext: span.parentSpanContext }),
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        ended: span.ended,
        resource: span.resource,
        instrumentationScope: span.instrumentationScope,
        droppedAttributesCount: span.droppedAttributesCount,
        droppedEventsCount: span.droppedEventsCount,
        droppedLinksCount: span.droppedLinksCount,
        // The only auto-instrumentation is fetch; its generated name is
        // replaced too, so future instrumentation changes cannot leak URLs.
        name:
            span.instrumentationScope.name ===
            "@opentelemetry/instrumentation-undici"
                ? "HTTP fetch"
                : span.name,
        attributes: safeAttributes(span.attributes),
        events: [],
        links: [],
        status: { code: span.status.code },
    };
}
