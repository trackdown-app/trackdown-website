// Marks this module server-only: it reads the game data and the answer.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import type { TripStep } from "@/lib/data/data-schema";
import {
    checkGuesses,
    playablePuzzle,
    totalMinutes,
    tripFrom,
} from "@/lib/game/played-puzzle";
import { maxGuesses } from "@/lib/game/rules";
import type { RevealInput, RevealOutput, RevealedGuess } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * The answer to a finished game: the mystery station and every guess's trip
 * with all its changes named. The `reveal` operation's one service: the
 * server function and `POST /api/v1/{network}/puzzles/{n}/reveal` both answer
 * with what it returns. The game is over when its last guess is the mystery
 * station or it has `maxGuesses` guesses; before that it throws
 * `game_not_over` and answers nothing of the puzzle.
 */
export async function revealAnswer(
    input: RevealInput,
    context: ServiceContext,
): Promise<RevealOutput> {
    const puzzle = await playablePuzzle(input.network, input.number, context);
    await checkGuesses(input.network, puzzle, input.guesses, context);

    const solved = input.guesses.at(-1) === puzzle.station;
    if (!solved && input.guesses.length < maxGuesses) {
        throw new ApiError(
            "game_not_over",
            `puzzle ${puzzle.n} is not over after ${input.guesses.length} of ${maxGuesses} guesses`,
        );
    }

    const guesses = await Promise.all(
        input.guesses.map(async (guess): Promise<RevealedGuess> => {
            if (guess === puzzle.station) {
                return { guess, correct: true, steps: [], totalMinutes: 0 };
            }
            const trip = await tripFrom(input.network, puzzle, guess, context);
            return {
                guess,
                correct: false,
                steps: trip.map(reveal),
                totalMinutes: totalMinutes(trip),
            };
        }),
    );
    return {
        network: input.network,
        number: puzzle.n,
        station: puzzle.station,
        solved,
        guesses,
    };
}

/** `step` built field by field, its station named. */
function reveal(step: TripStep): RevealedGuess["steps"][number] {
    if (step.kind === "ride") {
        return { kind: "ride", train: step.train, minutes: step.minutes };
    }
    return { kind: "change", station: step.station, minutes: step.minutes };
}
