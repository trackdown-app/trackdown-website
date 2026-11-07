// Marks this module server-only: its handlers read the game data.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import { openApiDocument, openApiInputSchema } from "@/lib/api/openapi";
import {
    errorResponse,
    guarded,
    rateLimited,
    restGet,
    restHandlers,
    restPost,
} from "@/lib/api/rest";
import type { RestHandler } from "@/lib/api/rest";
import { submitGuess } from "@/lib/game/guess";
import { getMeta } from "@/lib/game/meta";
import { getPuzzleArchive } from "@/lib/game/puzzle-archive";
import { revealAnswer } from "@/lib/game/reveal";
import {
    guessInputSchema,
    metaInputSchema,
    puzzleArchiveInputSchema,
    revealInputSchema,
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
 * `getTodayPuzzleFn` is the same for the web. It holds until the next puzzle
 * starts, so the CDN keeps it until then (docs/api.md#caching).
 */
export const todayPuzzleHandlers = restHandlers({
    GET: restGet(
        todayPuzzleInputSchema,
        (input) => getTodayPuzzle(input, serviceContext),
        (output) => ({
            maxAge:
                (Date.parse(output.nextPuzzleAt) - serviceContext.now().getTime()) /
                1000,
        }),
    ),
});

/**
 * `/api/v1/{network}/puzzles`: the `puzzleArchive` operation for iOS;
 * `getPuzzleArchiveFn` is the same for the web. It grows by one puzzle each
 * day, so it is never kept.
 */
export const puzzleArchiveHandlers = restHandlers({
    GET: restGet(puzzleArchiveInputSchema, (input) =>
        getPuzzleArchive(input, serviceContext),
    ),
});

/**
 * `/api/v1/{network}/puzzles/{n}/guesses`: the `guess` operation for iOS;
 * `submitGuessFn` is the same for the web.
 */
export const guessHandlers = restHandlers({
    POST: rateLimited(
        restPost(guessInputSchema, (input) => submitGuess(input, serviceContext)),
    ),
});

/**
 * `/api/v1/{network}/puzzles/{n}/reveal`: the `reveal` operation for iOS;
 * `revealAnswerFn` is the same for the web.
 */
export const revealHandlers = restHandlers({
    POST: rateLimited(
        restPost(revealInputSchema, (input) => revealAnswer(input, serviceContext)),
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
 * `/api/v1/openapi.json`: the OpenAPI document the iOS app generates its
 * client from (docs/api.md#the-openapi-document). It only changes with a
 * deploy, so the CDN keeps it. It is the one route anyone may call without
 * a client key (docs/api.md#client-identification): it holds no game data,
 * and tooling such as the app's client generator reads it.
 */
export const openApiHandlers = restHandlers(
    {
        GET: restGet(
            openApiInputSchema,
            () => Promise.resolve(openApiDocument),
            "deploy",
        ),
    },
    "anyone",
);

/**
 * Every path under `/api/v1` without an operation of its own: 404 in the
 * API's error format, not the site's not-found page. Guarded like an
 * operation, so a call without a client key cannot tell which paths exist.
 */
export const unknownOperationHandlers: { ANY: RestHandler } = {
    ANY: guarded(({ request }) =>
        Promise.resolve(
            errorResponse(
                new ApiError(
                    "not_found",
                    `${new URL(request.url).pathname} is not an API operation`,
                ),
            ),
        ),
    ),
};
