// Marks this module server-only: it answers REST requests on the server.
import "@tanstack/react-start/server-only";
import { z } from "zod";
import { ApiError } from "@/lib/api/api-error";

/** What a REST route's method handler gets from Start, as far as it reads it. */
export type RestContext = { request: Request };

export type RestHandler = (context: RestContext) => Promise<Response>;

/** `body` as JSON, with `status`. */
export function jsonResponse(body: unknown, status = 200): Response {
    return Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

/** `error` in the API's error format, with its status. */
export function errorResponse(error: ApiError): Response {
    return jsonResponse(error.toBody(), error.status);
}

/**
 * A `GET` handler for one operation: reads the input from the query string,
 * checks it against `input`, answers with what `run` returns as JSON, and
 * turns every error into the API's error format (docs/api.md#errors).
 */
export function restGet<S extends z.ZodType, O>(
    input: S,
    run: (input: z.output<S>) => Promise<O>,
): RestHandler {
    return async ({ request }) => {
        const query = Object.fromEntries(new URL(request.url).searchParams);
        const parsed = input.safeParse(query);
        if (!parsed.success) {
            return errorResponse(
                new ApiError("invalid_input", z.prettifyError(parsed.error)),
            );
        }
        try {
            return jsonResponse(await run(parsed.data));
        } catch (error) {
            return errorResponse(toApiError(error));
        }
    };
}

/**
 * A REST route's `handlers`, with every other method answered 405 in the
 * API's error format instead of falling through to the site's pages.
 */
export function restHandlers(handlers: { GET: RestHandler }): {
    GET: RestHandler;
    ANY: RestHandler;
} {
    return {
        ...handlers,
        ANY: ({ request }) => {
            const response = errorResponse(
                new ApiError(
                    "method_not_allowed",
                    `${request.method} is not allowed here; use GET`,
                ),
            );
            response.headers.set("Allow", "GET");
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
