// Marks this module server-only: it reads the game data and the answer.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import type { TripStep } from "@/lib/data/data-schema";
import { puzzleDate } from "@/lib/game/puzzle-day";
import { maxGuesses } from "@/lib/game/rules";
import type { GuessInput, GuessOutput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * One guess at a puzzle: the fastest trip from the guessed station to the
 * mystery station, with every change at a station the player has not guessed
 * before hidden. The `guess` operation's one service: the server function and
 * `POST /api/v1/{network}/puzzles/{n}/guesses` both answer with what it
 * returns. It never answers the mystery station, and a correct guess carries
 * no trip.
 */
export async function submitGuess(
    input: GuessInput,
    context: ServiceContext,
): Promise<GuessOutput> {
    const puzzles = await context.data.puzzles(input.network);
    const puzzle = puzzles.find((candidate) => candidate.n === input.number);
    // A puzzle after today's answers the same as one that does not exist, so
    // the schedule's future stays unknown.
    if (puzzle == null || puzzle.date > puzzleDate(context.now())) {
        throw new ApiError(
            "not_found",
            `network ${input.network} has no puzzle ${input.number} yet`,
        );
    }

    const stations = await context.data.stations(input.network);
    const codes = new Set(stations.map((station) => station.code));
    for (const code of [...input.earlierGuesses, input.guess]) {
        if (!codes.has(code)) {
            throw new ApiError(
                "invalid_input",
                `"${code}" is not a station of network ${input.network}`,
            );
        }
    }

    const earlier = new Set(input.earlierGuesses);
    if (earlier.size < input.earlierGuesses.length) {
        throw new ApiError("invalid_input", "the earlier guesses repeat a station");
    }
    if (earlier.has(input.guess)) {
        throw new ApiError("invalid_input", `"${input.guess}" was guessed before`);
    }
    if (input.earlierGuesses.length + 1 > maxGuesses) {
        throw new ApiError(
            "invalid_input",
            `a puzzle allows ${maxGuesses} guesses; this is guess ${input.earlierGuesses.length + 1}`,
        );
    }
    if (earlier.has(puzzle.station)) {
        throw new ApiError(
            "invalid_input",
            "an earlier guess already solved the puzzle",
        );
    }

    const result = {
        network: input.network,
        number: puzzle.n,
        guess: input.guess,
    };
    if (input.guess === puzzle.station) {
        return { ...result, correct: true, steps: [], totalMinutes: 0 };
    }

    const trips = await context.data.tripsTo(input.network, puzzle.station);
    const trip = trips[input.guess];
    if (trip == null) {
        // The data has a trip from every station to every mystery station
        // (docs/data.md), so this is the server's fault, not the caller's.
        throw new Error(
            `${input.network} has no trip from "${input.guess}" to puzzle ${puzzle.n}'s station`,
        );
    }
    return {
        ...result,
        correct: false,
        steps: trip.map((step) => redact(step, earlier)),
        totalMinutes: trip.reduce((total, step) => total + step.minutes, 0),
    };
}

/**
 * `step` as the player may see it: built field by field, with a change's
 * station only when it is among the earlier guesses.
 */
function redact(
    step: TripStep,
    earlierGuesses: ReadonlySet<string>,
): GuessOutput["steps"][number] {
    if (step.kind === "ride") {
        return { kind: "ride", train: step.train, minutes: step.minutes };
    }
    return {
        kind: "change",
        station: earlierGuesses.has(step.station) ? step.station : null,
        minutes: step.minutes,
    };
}
