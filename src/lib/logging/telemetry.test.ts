import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { context, logs, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace";
import { ApiError } from "@/lib/api/api-error";
import { errorResponse, toApiError } from "@/lib/api/rest";
import {
    errorAttributes,
    operationAttributes,
    safeAttributes,
} from "@/lib/logging/attributes";
import { createLogger } from "@/lib/logging/logger";
import { annotateRequest, requestAttributes } from "@/lib/logging/request-metadata";
import { traceRequest } from "@/lib/logging/request-span";
import {
    posthogLogsEndpoint,
    posthogTracesEndpoint,
    projectToken,
    startTelemetry,
} from "@/lib/logging/telemetry";
import { withSpan } from "@/lib/logging/tracing";

const captured = vi.hoisted(() => ({
    spans: vi.fn<(spans: ReadableSpan[]) => void>(),
    logs: vi.fn<(records: ReadableLogRecord[]) => void>(),
    traceOptions: vi.fn(),
    logOptions: vi.fn(),
    background: vi.fn<(promise: Promise<unknown>) => void>(),
}));

vi.mock("@vercel/functions", () => ({ waitUntil: captured.background }));
vi.mock("@opentelemetry/exporter-trace-otlp-proto", () => ({
    OTLPTraceExporter: class implements SpanExporter {
        constructor(options: unknown) {
            captured.traceOptions(options);
        }
        export(batch: ReadableSpan[], done: Parameters<SpanExporter["export"]>[1]) {
            captured.spans(batch);
            done({ code: 0 });
        }
        shutdown() {
            return Promise.resolve();
        }
    },
}));
vi.mock("@opentelemetry/exporter-logs-otlp-http", () => ({
    OTLPLogExporter: class implements LogRecordExporter {
        constructor(options: unknown) {
            captured.logOptions(options);
        }
        export(
            batch: ReadableLogRecord[],
            done: Parameters<LogRecordExporter["export"]>[1],
        ) {
            captured.logs(batch);
            done({ code: 0 });
        }
        shutdown() {
            return Promise.resolve();
        }
        forceFlush() {
            return Promise.resolve();
        }
    },
}));

beforeEach(() => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_testproject");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    captured.spans.mockClear();
    captured.logs.mockClear();
    captured.background.mockClear();
    captured.traceOptions.mockClear();
    captured.logOptions.mockClear();
});

afterEach(async () => {
    await globalThis.trackdownTelemetry?.shutdown();
    globalThis.trackdownTelemetry = undefined;
    const output = globalThis.trackdownConsoleOutput;
    if (output != null) {
        console.info = output.info;
        console.warn = output.warn;
        console.error = output.error;
    }
    globalThis.trackdownConsoleOutput = undefined;
    trace.disable();
    logs.disable();
    context.disable();
});

function spans(): ReadableSpan[] {
    return captured.spans.mock.calls.flatMap(([batch]) => batch);
}
function records(): ReadableLogRecord[] {
    return captured.logs.mock.calls.flatMap(([batch]) => batch);
}
async function background(): Promise<void> {
    await Promise.all(captured.background.mock.calls.map(([task]) => task));
}

describe("startup and export", () => {
    it("validates the token without exposing an invalid value", () => {
        expect(projectToken({})).toBeUndefined();
        expect(() => projectToken({ VERCEL: "1" })).toThrow(
            "POSTHOG_PROJECT_TOKEN is required on Vercel",
        );
        expect(() =>
            projectToken({ POSTHOG_PROJECT_TOKEN: "secret station" }),
        ).toThrow("POSTHOG_PROJECT_TOKEN must be a PostHog project token");
        expect(projectToken({ POSTHOG_PROJECT_TOKEN: " phc_testproject " })).toBe(
            "phc_testproject",
        );
    });

    it("starts providers once per instance and uses both EU endpoints", async () => {
        const first = startTelemetry();
        expect(startTelemetry()).toBe(first);
        await first.flush();
        expect(captured.traceOptions).toHaveBeenCalledExactlyOnceWith({
            url: posthogTracesEndpoint,
            headers: { Authorization: "Bearer phc_testproject" },
            timeoutMillis: 5000,
        });
        expect(captured.logOptions).toHaveBeenCalledExactlyOnceWith({
            url: posthogLogsEndpoint,
            headers: { Authorization: "Bearer phc_testproject" },
            timeoutMillis: 5000,
        });
        expect(records()[0]?.resource.attributes).toMatchObject({
            "service.name": "trackdown-website",
            "deployment.environment": "preview",
        });
    });
});

describe("request lifecycle", () => {
    it("exports correlated logs and a request trace after a streaming response finishes", async () => {
        startTelemetry();
        const request = new Request(
            "https://trackdown.test/api/v1/nl/puzzles/42/guesses?guess=secret",
            { method: "POST" },
        );
        const response = await traceRequest(request, async () => {
            await withSpan(
                "server function submitGuessFn",
                {
                    attributes: operationAttributes({
                        network: "nl",
                        number: 42,
                        guess: "secret",
                    }),
                },
                async () => {
                    await Promise.resolve();
                    createLogger("api").info("Request completed", {
                        "trackdown.network": "nl",
                    });
                },
            );
            return new Response("private response body", {
                headers: { "X-Test": "kept" },
            });
        });
        expect(captured.background).toHaveBeenCalledTimes(1);
        expect(captured.spans).not.toHaveBeenCalled();
        expect(await response.text()).toBe("private response body");
        expect(response.headers.get("X-Test")).toBe("kept");
        await background();
        const root = spans().find((span) => span.kind === SpanKind.SERVER);
        const child = spans().find(
            (span) => span.name === "server function submitGuessFn",
        );
        expect(root?.attributes).toMatchObject({
            "trackdown.network": "nl",
            "trackdown.puzzle.number": 42,
            "trackdown.outcome": "ok",
            "http.response.status_code": 200,
        });
        expect(child?.parentSpanContext?.spanId).toBe(root?.spanContext().spanId);
        expect(
            records().find((record) => record.instrumentationScope.name === "api")
                ?.spanContext?.spanId,
        ).toBe(child?.spanContext().spanId);
        expect(
            records().find((record) => record.instrumentationScope.name === "http")
                ?.body,
        ).toMatch(
            /^POST \/api\/v1\/\{network\}\/puzzles\/\{number\}\/guesses 200 \(\d+ ms\) network=nl puzzle=42$/,
        );
        expect(JSON.stringify({ spans: spans(), logs: records() })).not.toMatch(
            /secret|private response body|guess=/,
        );
    });

    it("isolates metadata and exports every concurrent request", async () => {
        startTelemetry();
        await Promise.all([
            traceRequest(
                new Request("https://trackdown.test/api/v1/meta"),
                async () => {
                    annotateRequest({
                        "trackdown.network": "nl",
                        "trackdown.puzzle.number": 7,
                    });
                    await Promise.resolve();
                    return new Response(null, { status: 204 });
                },
            ),
            traceRequest(
                new Request("https://trackdown.test/nl/archief"),
                async () => {
                    annotateRequest({
                        "trackdown.network": "nl",
                        "trackdown.puzzle.number": 8,
                    });
                    await Promise.resolve();
                    return new Response(null, { status: 204 });
                },
            ),
        ]);
        await background();
        const messages = records()
            .filter((record) => record.instrumentationScope.name === "http")
            .map((record) => record.body);
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.stringMatching(
                    /^GET \/api\/v1\/meta 204 \(\d+ ms\) network=nl puzzle=7$/,
                ),
                expect.stringMatching(
                    /^GET \/\{network\}\/archief 204 \(\d+ ms\) network=nl puzzle=8$/,
                ),
            ]),
        );
    });

    it("shows known function names and keeps payload fields out of the message", async () => {
        startTelemetry();
        createLogger("http").request(
            "info",
            safeAttributes({
                "http.request.method": "POST",
                "code.function.name": "submitGuessFn",
                "http.response.status_code": 200,
                "http.server.request.duration_ms": 12.4,
                "trackdown.network": "nl",
                "trackdown.puzzle.number": 42,
                guess: "secret",
                station: "Ut",
            }),
        );
        await globalThis.trackdownTelemetry?.flush();
        expect(
            records().find((record) => record.instrumentationScope.name === "http")
                ?.body,
        ).toBe("POST submitGuessFn 200 (12 ms) network=nl puzzle=42");
        expect(JSON.stringify(records())).not.toMatch(/secret|Ut/);
    });

    it("flushes a thrown failure and never records its message or data", async () => {
        startTelemetry();
        const failure = new Error("mystery=Ut; token=secret");
        await expect(
            traceRequest(new Request("https://trackdown.test/Ut?key=secret"), () =>
                Promise.reject(failure),
            ),
        ).rejects.toBe(failure);
        await background();
        expect(spans()[0]?.status.code).toBe(SpanStatusCode.ERROR);
        expect(spans()[0]?.attributes["error.type"]).toBe("internal_error");
        expect(JSON.stringify({ spans: spans(), logs: records() })).not.toMatch(
            /mystery=|secret|Ut/,
        );
    });

    it("flushes on cancellation and keeps errors in the API format", async () => {
        startTelemetry();
        const response = await traceRequest(
            new Request("https://trackdown.test/api/v1/nl/puzzles/2/reveal"),
            () =>
                Promise.resolve(
                    errorResponse(new ApiError("rate_limited", "private")),
                ),
        );
        await response.body?.cancel();
        await background();
        expect(response.status).toBe(429);
        expect(spans()[0]?.attributes).toMatchObject({
            "http.response.status_code": 429,
            "trackdown.outcome": "refused",
        });
        expect(JSON.stringify(records())).not.toContain("private");
    });

    it("flushes responses without bodies and contains export failures", async () => {
        startTelemetry();
        const response = await traceRequest(
            new Request("https://trackdown.test/"),
            () => Promise.resolve(new Response(null, { status: 204 })),
        );
        await background();
        expect(response.status).toBe(204);
        expect(spans()[0]?.attributes["http.response.status_code"]).toBe(204);
        vi.spyOn(
            globalThis.trackdownTelemetry ?? startTelemetry(),
            "flush",
        ).mockRejectedValue(new Error("secret exporter failure"));
        await traceRequest(new Request("https://trackdown.test/"), () =>
            Promise.resolve(new Response(null, { status: 204 })),
        );
        await expect(background()).resolves.toBeUndefined();
    });

    it("flushes late work when a response stream fails", async () => {
        startTelemetry();
        const response = await traceRequest(
            new Request("https://trackdown.test/"),
            () =>
                Promise.resolve(
                    new Response(
                        new ReadableStream<Uint8Array>({
                            async pull(controller) {
                                await withSpan(
                                    "server function getMetaFn",
                                    {},
                                    async () => {
                                        await Promise.resolve();
                                    },
                                );
                                controller.error(
                                    new Error("private stream failure"),
                                );
                            },
                        }),
                    ),
                ),
        );
        await expect(response.text()).rejects.toThrow("private stream failure");
        await background();
        expect(spans().map((span) => span.name)).toContain(
            "server function getMetaFn",
        );
        expect(JSON.stringify({ spans: spans(), logs: records() })).not.toContain(
            "private stream failure",
        );
    });
});

describe("privacy boundaries", () => {
    it("keeps only known routes, methods, networks and numeric puzzle numbers", () => {
        expect(
            requestAttributes(
                new Request(
                    "https://trackdown.test/en/nl/archief/42?station=secret",
                ),
            ),
        ).toMatchObject({
            "http.route": "/{network}/archief/{number}",
            "trackdown.network": "nl",
            "trackdown.puzzle.number": 42,
        });
        expect(
            requestAttributes(new Request("https://trackdown.test/be/archief/1"))[
                "http.route"
            ],
        ).toBe("unknown");
        expect(
            requestAttributes(
                new Request(
                    "https://trackdown.test/api/v1/secret/puzzles/3/guesses",
                ),
            ),
        ).toMatchObject({
            "http.route": "/api/v1/{network}/puzzles/{number}/guesses",
            "trackdown.puzzle.number": 3,
        });
        expect(
            requestAttributes(new Request("https://trackdown.test/secret"))[
                "http.route"
            ],
        ).toBe("unknown");
        expect(
            safeAttributes({
                "trackdown.network": "nl",
                station: "secret",
                "url.full": "https://secret.test",
            }),
        ).toEqual({ "trackdown.network": "nl" });
        expect(safeAttributes({ "trackdown.network": "secret" })).toEqual({});
    });

    it("suppresses third-party console arguments and raw API errors in both outputs", async () => {
        startTelemetry();
        const output = globalThis.trackdownConsoleOutput;
        const printed = vi.spyOn(output ?? console, "error");
        console.error(
            "mystery station",
            { station: "secret" },
            new Error("answer=Ut"),
        );
        const result = toApiError(new Error("answer=Ut"));
        expect(result.code).toBe("internal_error");
        expect(errorAttributes(new ApiError("not_found", "Ut"))).toEqual({
            "error.type": "not_found",
            "trackdown.outcome": "not_found",
        });
        await globalThis.trackdownTelemetry?.flush();
        expect(JSON.stringify(printed.mock.calls)).not.toMatch(
            /mystery station|secret|answer=Ut/,
        );
        expect(JSON.stringify(records())).not.toMatch(
            /mystery station|secret|answer=Ut/,
        );
    });

    it("removes automatic fetch URLs, status descriptions, links and exception events", async () => {
        startTelemetry();
        await trace
            .getTracer("@opentelemetry/instrumentation-undici")
            .startActiveSpan("GET https://secret.test/Ut", async (span) => {
                span.setAttributes({
                    "url.full": "https://secret.test/Ut?token=secret",
                    "http.request.method": "GET",
                    "http.response.status_code": 500,
                });
                span.recordException(new Error("station=Ut"));
                span.setStatus({ code: SpanStatusCode.ERROR, message: "secret" });
                span.end();
                await Promise.resolve();
            });
        await globalThis.trackdownTelemetry?.flush();
        expect(spans()[0]).toMatchObject({
            name: "HTTP fetch",
            events: [],
            links: [],
            attributes: {
                "http.request.method": "GET",
                "http.response.status_code": 500,
            },
            status: { code: SpanStatusCode.ERROR },
        });
        expect(JSON.stringify(spans())).not.toMatch(/secret|station=Ut/);
    });
});
