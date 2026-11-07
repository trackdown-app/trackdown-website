// Marks this module server-only: its handlers read the game data.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import { errorResponse, restGet, restHandlers } from "@/lib/api/rest";
import type { RestHandler } from "@/lib/api/rest";
import { getMeta } from "@/lib/game/meta";
import { metaInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";

// The handlers of every REST route under `/api/v1` (docs/api.md). Each route
// file in `src/routes/api/v1/` only hands its handlers to Start, so the tests
// call these directly.

/** `/api/v1/meta`: the `meta` operation for iOS; `getMetaFn` is the same for the web. */
export const metaHandlers = restHandlers({
    GET: restGet(metaInputSchema, (input) => getMeta(input, serviceContext)),
});

/**
 * Every path under `/api/v1` without an operation of its own: 404 in the
 * API's error format, not the site's not-found page.
 */
export const unknownOperationHandlers: { ANY: RestHandler } = {
    ANY: ({ request }) =>
        Promise.resolve(
            errorResponse(
                new ApiError(
                    "not_found",
                    `${new URL(request.url).pathname} is not an API operation`,
                ),
            ),
        ),
};
