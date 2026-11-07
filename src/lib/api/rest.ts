// Marks this module server-only: it answers REST requests on the server.
import "@tanstack/react-start/server-only";
import { z } from "@/lib/zod";
import { ApiError } from "@/lib/api/api-error";
import { unknownClientError } from "@/lib/api/client-identification";
import { crossOriginError, rateLimitRefusal } from "@/lib/api/request-guard";
import { trace } from "@opentelemetry/api";
import { errorAttributes, operationAttributes } from "@/lib/logging/attributes";
import { createLogger } from "@/lib/logging/logger";
import { annotateRequest } from "@/lib/logging/request-metadata";

/**
 * What a REST route's method handler gets from Start, as far as it reads it:
 * the request and the route's path parameters (`$network`).
 */
export type RestContext = {
    request: Request;
    params: Readonly<Record<string, string>>;
};

export type RestHandler = (context: RestContext) => Promise<Response>;

/**
 * How long an answer may be kept (docs/api.md#caching):
 * - `none`: never; every error and every answer that changes between deploys.
 * - `deploy`: an answer that only changes with a deploy. Vercel's CDN keeps
 *   it for a year, scoped to the deployment, so a new deploy answers afresh;
 *   a client keeps it for a day.
 * - `{ maxAge }`: an answer that holds for `maxAge` more seconds, such as
 *   today's puzzle until the next one starts. The CDN and a client both keep
 *   it that long; `0` or less is never kept.
 */
export type RestCache = "none" | "deploy" | { maxAge: number };

function cacheHeaders(cache: RestCache): Record<string, string> {
    if (cache === "deploy") {
        return {
            "Cache-Control": "public, max-age=86400",
            "Vercel-CDN-Cache-Control": "public, max-age=31536000",
        };
    }
    if (cache === "none" || cache.maxAge <= 0) {
        return { "Cache-Control": "no-store" };
    }
    const maxAge = Math.floor(cache.maxAge);
    return {
        "Cache-Control": `public, max-age=${maxAge}`,
        "Vercel-CDN-Cache-Control": `public, max-age=${maxAge}`,
    };
}

/** `body` as JSON, with `status` and the headers of `cache`. */
export function jsonResponse(
    body: unknown,
    status = 200,
    cache: RestCache = "none",
): Response {
    return Response.json(body, {
        status,
        // Keeps every API answer out of search results, even one a crawler
        // reached despite `robots.txt` (docs/seo.md#robotstxt).
        headers: { ...cacheHeaders(cache), "X-Robots-Tag": "noindex" },
    });
}

/** `error` in the API's error format, with its status. */
export function errorResponse(error: ApiError): Response {
    trace.getActiveSpan()?.setAttributes(errorAttributes(error));
    annotateRequest(errorAttributes(error));
    return jsonResponse(error.toBody(), error.status);
}

/**
 * A `GET` handler for one operation: reads the input from the query string
 * and the path parameters (which win over a query field of the same name),
 * checks it against `input`, answers with what `run` returns as JSON, and
 * turns every error into the API's error format (docs/api.md#errors). A
 * successful answer carries the headers of `cache`, which may be worked out
 * from the answer itself; an error is never kept.
 */
export function restGet<S extends z.ZodType, O>(
    input: S,
    run: (input: z.output<S>) => Promise<O>,
    cache: RestCache | ((output: O) => RestCache) = "none",
): RestHandler {
    return ({ request, params }) => {
        const query = Object.fromEntries(new URL(request.url).searchParams);
        return answer(input, { ...query, ...params }, run, cache);
    };
}

/**
 * A `POST` handler for one operation: reads the input from the JSON body and
 * the path parameters (which win over a body field of the same name), and
 * answers like `restGet`, never kept. A body that is not a JSON object is
 * `invalid_input`.
 */
export function restPost<S extends z.ZodType, O>(
    input: S,
    run: (input: z.output<S>) => Promise<O>,
): RestHandler {
    return async ({ request, params }) => {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return errorResponse(
                new ApiError("invalid_input", "the request body is not JSON"),
            );
        }
        if (typeof body !== "object" || body == null || Array.isArray(body)) {
            return errorResponse(
                new ApiError(
                    "invalid_input",
                    "the request body is not a JSON object",
                ),
            );
        }
        return answer(input, { ...body, ...params }, run);
    };
}

/** `fields` checked against `input`, then `run`'s answer, as `restGet` describes. */
async function answer<S extends z.ZodType, O>(
    input: S,
    fields: Record<string, unknown>,
    run: (input: z.output<S>) => Promise<O>,
    cache: RestCache | ((output: O) => RestCache) = "none",
): Promise<Response> {
    const parsed = input.safeParse(fields);
    if (!parsed.success) {
        return errorResponse(
            new ApiError("invalid_input", z.prettifyError(parsed.error)),
        );
    }
    trace.getActiveSpan()?.setAttributes(operationAttributes(parsed.data));
    annotateRequest(operationAttributes(parsed.data));
    let output: O;
    try {
        output = await run(parsed.data);
    } catch (error) {
        return errorResponse(toApiError(error));
    }
    // Today's puzzle and default-network operations learn this metadata
    // from the service. The helper reads no other fields from the output.
    trace.getActiveSpan()?.setAttributes(operationAttributes(output));
    annotateRequest(operationAttributes(output));
    return jsonResponse(
        output,
        200,
        typeof cache === "function" ? cache(output) : cache,
    );
}

/**
 * `handler` behind the game's rate limit per IP (docs/api.md#rate-limit):
 * past it, `rate_limited` (429) with `Retry-After`, and `handler` never runs.
 */
export function rateLimited(handler: RestHandler): RestHandler {
    return (context) => {
        const refusal = rateLimitRefusal(context.request);
        if (refusal == null) {
            return handler(context);
        }
        const response = errorResponse(refusal.error);
        response.headers.set("Retry-After", String(refusal.retryAfterSeconds));
        return Promise.resolve(response);
    };
}

/**
 * Who may call a route (docs/api.md#client-identification):
 * - `client`: only a call that names an accepted client key and its app
 *   version, such as the iOS app's.
 * - `anyone`: any call, such as the OpenAPI document's.
 */
export type RestAccess = "client" | "anyone";

/**
 * `handler` behind the guards every REST call passes first, in order: a
 * browser call from another origin is `cross_origin` (403,
 * docs/api.md#cross-origin-calls), with no CORS headers so the browser keeps
 * even the error from the page; with `client` access, a call without an
 * accepted client key and app version is `unknown_client` (401).
 */
export function guarded(
    handler: RestHandler,
    access: RestAccess = "client",
): RestHandler {
    return (context) => {
        const error =
            crossOriginError(context.request) ??
            (access === "client" ? unknownClientError(context.request) : null);
        return error == null
            ? handler(context)
            : Promise.resolve(errorResponse(error));
    };
}

/** The 405 answer of a route whose methods are `allow`. */
function methodNotAllowed(allow: string): RestHandler {
    return ({ request }) => {
        const response = errorResponse(
            new ApiError(
                "method_not_allowed",
                `${request.method} is not allowed here; use ${allow}`,
            ),
        );
        response.headers.set("Allow", allow);
        return Promise.resolve(response);
    };
}

/**
 * A REST route's `handlers`, each behind `guarded` with `access` (the
 * client's by default), and every other method answered 405 in the API's
 * error format instead of falling through to the site's pages. The 405 is
 * guarded too, so a preflight from another origin is `cross_origin`.
 */
export function restHandlers(
    handlers: { GET: RestHandler },
    access?: RestAccess,
): { GET: RestHandler; ANY: RestHandler };
export function restHandlers(
    handlers: { POST: RestHandler },
    access?: RestAccess,
): { POST: RestHandler; ANY: RestHandler };
export function restHandlers(
    handlers: { GET?: RestHandler; POST?: RestHandler },
    access: RestAccess = "client",
): { GET?: RestHandler; POST?: RestHandler; ANY: RestHandler } {
    const allow = Object.keys(handlers).join(", ");
    return {
        ...(handlers.GET == null ? {} : { GET: guarded(handlers.GET, access) }),
        ...(handlers.POST == null ? {} : { POST: guarded(handlers.POST, access) }),
        ANY: guarded(methodNotAllowed(allow), access),
    };
}

/**
 * An `ApiError` as it is; any other error logged and answered as
 * `internal_error`, so its message (a file path, a schema issue) never
 * reaches a client.
 */
export function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
        return error;
    }
    createLogger("api").error("API operation failed", errorAttributes(error));
    return new ApiError("internal_error", "Something went wrong on the server");
}
