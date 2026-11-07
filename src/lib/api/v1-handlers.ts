// Marks this module server-only: its handlers read the game data.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import { errorResponse, restGet, restHandlers, restPost } from "@/lib/api/rest";
import type { RestHandler } from "@/lib/api/rest";
import { submitGuess } from "@/lib/game/guess";
import { getMeta } from "@/lib/game/meta";
import {
    guessInputSchema,
    metaInputSchema,
    todayPuzzleInputSchema,
} from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";
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
 * `/api/v1/{network}/puzzles/{n}/guesses`: the `guess` operation for iOS;
 * `submitGuessFn` is the same for the web.
 */
export const guessHandlers = restHandlers({
    POST: restPost(guessInputSchema, (input) => submitGuess(input, serviceContext)),
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
