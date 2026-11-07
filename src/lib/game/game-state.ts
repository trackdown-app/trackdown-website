import { z } from "zod";
import type { NetworkId } from "@/lib/data/networks";
import { guessOutputSchema } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";

// A player's game at one puzzle, as the page keeps it between visits
// (docs/game.md#game-state): the guesses so far, each the `guess`
// operation's answer, and the day the game ended. Holds no data, so it runs
// in the browser.

/** Where a game is kept: one entry per network and puzzle. */
export function gameStorageKey(network: NetworkId, number: number): string {
    return `trackdown:game:v1:${network}:${number}`;
}

/** One kept guess: the `guess` operation's answer without its network and number. */
const storedGuessSchema = guessOutputSchema.pick({
    guess: true,
    correct: true,
    steps: true,
    totalMinutes: true,
});

const storedGameSchema = z.object({
    /** The guesses so far, oldest first. */
    guesses: z.array(storedGuessSchema),
    /**
     * The puzzle day, `YYYY-MM-DD` in Europe/Amsterdam, on which the game
     * ended. Games kept before statistics have none.
     */
    finishedOn: z.iso.date().optional(),
});

/** A kept game: its guesses, oldest first, and the day it ended, if it did. */
export type StoredGame = {
    guesses: ListedGuess[];
    finishedOn: string | null;
};

/**
 * The game kept in `raw`. Nothing kept, or anything that is not a game this
 * version wrote, is a game with no guesses yet.
 */
export function readStoredGame(raw: string | null): StoredGame {
    const empty: StoredGame = { guesses: [], finishedOn: null };
    if (raw == null) {
        return empty;
    }
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return empty;
    }
    const parsed = storedGameSchema.safeParse(value);
    return parsed.success
        ? {
              guesses: parsed.data.guesses,
              finishedOn: parsed.data.finishedOn ?? null,
          }
        : empty;
}

/** The guesses kept in `raw`, oldest first, as `readStoredGame` reads them. */
export function parseStoredGame(raw: string | null): ListedGuess[] {
    return readStoredGame(raw).guesses;
}

/**
 * `guesses`, oldest first, and the day the game ended, as `readStoredGame`
 * reads them back.
 */
export function serializeGame(
    guesses: readonly ListedGuess[],
    finishedOn: string | null = null,
): string {
    return JSON.stringify({
        guesses: guesses.map(({ guess, correct, steps, totalMinutes }) => ({
            guess,
            correct,
            steps,
            totalMinutes,
        })),
        ...(finishedOn == null ? {} : { finishedOn }),
    });
}

/** Whether the player is still guessing, found the station, or ran out of guesses. */
export type GameStatus = "playing" | "won" | "lost";

export function gameStatus(
    guesses: readonly ListedGuess[],
    maxGuesses: number,
): GameStatus {
    if (guesses.some((guess) => guess.correct)) {
        return "won";
    }
    return guesses.length >= maxGuesses ? "lost" : "playing";
}
