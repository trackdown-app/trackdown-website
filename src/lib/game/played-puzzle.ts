// Marks this module server-only: it reads the game data and the answer.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import type { Puzzle, StationCode, TripStep } from "@/lib/data/data-schema";
import type { NetworkId } from "@/lib/data/networks";
import { puzzleDate } from "@/lib/game/puzzle-day";
import { maxGuesses } from "@/lib/game/rules";
import type { ServiceContext } from "@/lib/game/service-context";

// The checks the `guess` and `reveal` operations share: which puzzle may be
// played, and which guesses at it are a game a player could have played.

/**
 * Puzzle `number` of `network`, when it is today's or an earlier one. A
 * puzzle after today's throws the same `not_found` as one that does not
 * exist, so the schedule's future stays unknown.
 */
export async function playablePuzzle(
    network: NetworkId,
    number: number,
    context: ServiceContext,
): Promise<Puzzle> {
    const puzzles = await context.data.puzzles(network);
    const puzzle = puzzles.find((candidate) => candidate.n === number);
    if (puzzle == null || puzzle.date > puzzleDate(context.now())) {
        throw new ApiError(
            "not_found",
            `network ${network} has no puzzle ${number} yet`,
        );
    }
    return puzzle;
}

/**
 * Throws `invalid_input` unless `guesses`, oldest first, are a game a player
 * could have played at `puzzle`: every one a station of the network, none
 * twice, no more than `maxGuesses`, and none after the one that solved it.
 */
export async function checkGuesses(
    network: NetworkId,
    puzzle: Puzzle,
    guesses: readonly StationCode[],
    context: ServiceContext,
): Promise<void> {
    const stations = await context.data.stations(network);
    const codes = new Set(stations.map((station) => station.code));
    for (const code of guesses) {
        if (!codes.has(code)) {
            throw new ApiError(
                "invalid_input",
                `"${code}" is not a station of network ${network}`,
            );
        }
    }

    const seen = new Set<StationCode>();
    for (const code of guesses) {
        if (seen.has(code)) {
            throw new ApiError("invalid_input", `"${code}" was guessed before`);
        }
        seen.add(code);
    }
    if (guesses.length > maxGuesses) {
        throw new ApiError(
            "invalid_input",
            `a puzzle allows ${maxGuesses} guesses; this is guess ${guesses.length}`,
        );
    }
    const solvedAt = guesses.indexOf(puzzle.station);
    if (solvedAt !== -1 && solvedAt < guesses.length - 1) {
        throw new ApiError(
            "invalid_input",
            "an earlier guess already solved the puzzle",
        );
    }
}

/** The fastest trip from `guess` to `puzzle`'s station, as stored. */
export async function tripFrom(
    network: NetworkId,
    puzzle: Puzzle,
    guess: StationCode,
    context: ServiceContext,
): Promise<TripStep[]> {
    const trips = await context.data.tripsTo(network, puzzle.station);
    const trip = trips[guess];
    if (trip == null) {
        // The data has a trip from every station to every mystery station
        // (docs/data.md), so this is the server's fault, not the caller's.
        throw new Error(
            `${network} has no trip from "${guess}" to puzzle ${puzzle.n}'s station`,
        );
    }
    return trip;
}

/** Every ride and change of `trip` together, in minutes. */
export function totalMinutes(trip: readonly TripStep[]): number {
    return trip.reduce((total, step) => total + step.minutes, 0);
}
