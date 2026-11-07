// Marks this module server-only: it answers REST requests on the server.
import "@tanstack/react-start/server-only";
import { z } from "zod";
import { ApiError } from "@/lib/api/api-error";

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
 */
export type RestCache = "none" | "deploy";

const cacheHeaders: Record<RestCache, Readonly<Record<string, string>>> = {
    none: { "Cache-Control": "no-store" },
    deploy: {
        "Cache-Control": "public, max-age=86400",
        "Vercel-CDN-Cache-Control": "public, max-age=31536000",
    },
};

/** `body` as JSON, with `status` and the headers of `cache`. */
export function jsonResponse(
    body: unknown,
    status = 200,
    cache: RestCache = "none",
): Response {
    return Response.json(body, { status, headers: cacheHeaders[cache] });
}

/** `error` in the API's error format, with its status. */
export function errorResponse(error: ApiError): Response {
    return jsonResponse(error.toBody(), error.status);
}

/**
 * A `GET` handler for one operation: reads the input from the query string
 * and the path parameters (which win over a query field of the same name),
 * checks it against `input`, answers with what `run` returns as JSON, and
 * turns every error into the API's error format (docs/api.md#errors). A
 * successful answer carries the headers of `cache`; an error is never kept.
 */
export function restGet<S extends z.ZodType, O>(
    input: S,
    run: (input: z.output<S>) => Promise<O>,
    cache: RestCache = "none",
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
    cache: RestCache = "none",
): Promise<Response> {
    const parsed = input.safeParse(fields);
    if (!parsed.success) {
        return errorResponse(
            new ApiError("invalid_input", z.prettifyError(parsed.error)),
        );
    }
    try {
        return jsonResponse(await run(parsed.data), 200, cache);
    } catch (error) {
        return errorResponse(toApiError(error));
    }
}

type RestMethod = "GET" | "POST";

/**
 * A REST route's `handlers`, with every other method answered 405 in the
 * API's error format instead of falling through to the site's pages.
 */
export function restHandlers<M extends RestMethod>(
    handlers: Record<M, RestHandler>,
): Record<M, RestHandler> & { ANY: RestHandler } {
    const allow = Object.keys(handlers).join(", ");
    return {
        ...handlers,
        ANY: ({ request }) => {
            const response = errorResponse(
                new ApiError(
                    "method_not_allowed",
                    `${request.method} is not allowed here; use ${allow}`,
                ),
            );
            response.headers.set("Allow", allow);
            return Promise.resolve(response);
        },
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
    console.error("An API operation failed", error);
    return new ApiError("internal_error", "Something went wrong on the server");
}
