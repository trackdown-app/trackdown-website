// Marks this module server-only: its handlers read the game data.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import { errorResponse, restGet, restHandlers } from "@/lib/api/rest";
import type { RestHandler } from "@/lib/api/rest";
import { getMeta } from "@/lib/game/meta";
import {
    metaInputSchema,
    stationsInputSchema,
    todayPuzzleInputSchema,
} from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";
import { getStations } from "@/lib/game/stations";
import { getTodayPuzzle } from "@/lib/game/today-puzzle";

// The handlers of every REST route under `/api/v1` (docs/api.md). Each route
// file in `src/routes/api/v1/` only hands its handlers to Start, so the tests
// call these directly.

/** `/api/v1/meta`: the `meta` operation for iOS; `getMetaFn` is the same for the web. */
export const metaHandlers = restHandlers({
    GET: restGet(metaInputSchema, (input) => getMeta(input, serviceContext)),
});

/**
 * `/api/v1/{network}/puzzles/today`: the `todayPuzzle` operation for iOS;
 * `getTodayPuzzleFn` is the same for the web.
 */
export const todayPuzzleHandlers = restHandlers({
    GET: restGet(todayPuzzleInputSchema, (input) =>
        getTodayPuzzle(input, serviceContext),
    ),
});

/**
 * `/api/v1/{network}/stations`: the `stations` operation for iOS;
 * `getStationsFn` is the same for the web. It only changes with a deploy, so
 * the CDN keeps it (docs/api.md#caching).
 */
export const stationsHandlers = restHandlers({
    GET: restGet(
        stationsInputSchema,
        (input) => getStations(input, serviceContext),
        "deploy",
    ),
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
