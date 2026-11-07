// Marks this module server-only: it reads the game data and the answer.
import "@tanstack/react-start/server-only";
import type { TripStep } from "@/lib/data/data-schema";
import {
    checkGuesses,
    playablePuzzle,
    totalMinutes,
    tripFrom,
} from "@/lib/game/played-puzzle";
import type { GuessInput, GuessOutput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * One guess at a puzzle: the fastest trip from the guessed station to the
 * mystery station, with every change at a station the player has not guessed
 * before hidden. The `guess` operation's one service: the server function and
 * `POST /api/v1/{network}/puzzles/{n}/guesses` both answer with what it
 * returns. It never answers the mystery station, and a correct guess carries
 * no trip. It also answers the earlier guesses' trips again, their changes
 * named by every guess so far, so a change the player has just guessed
 * shows on the trips before it too.
 */
export async function submitGuess(
    input: GuessInput,
    context: ServiceContext,
): Promise<GuessOutput> {
    const puzzle = await playablePuzzle(input.network, input.number, context);
    await checkGuesses(
        input.network,
        puzzle,
        [...input.earlierGuesses, input.guess],
        context,
    );

    // The earlier trips again, every change the player has now guessed
    // named, this guess included. `checkGuesses` made sure none of them
    // solved the puzzle, so each has a trip.
    const known = new Set([...input.earlierGuesses, input.guess]);
    const earlierTrips = await Promise.all(
        input.earlierGuesses.map(async (earlierGuess) => {
            const trip = await tripFrom(
                input.network,
                puzzle,
                earlierGuess,
                context,
            );
            return {
                guess: earlierGuess,
                steps: trip.map((step) => redact(step, known)),
            };
        }),
    );

    const result = {
        network: input.network,
        number: puzzle.n,
        guess: input.guess,
        earlierTrips,
    };
    if (input.guess === puzzle.station) {
        return { ...result, correct: true, steps: [], totalMinutes: 0 };
    }

    const trip = await tripFrom(input.network, puzzle, input.guess, context);
    const earlier = new Set(input.earlierGuesses);
    return {
        ...result,
        correct: false,
        steps: trip.map((step) => redact(step, earlier)),
        totalMinutes: totalMinutes(trip),
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
