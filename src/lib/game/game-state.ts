import { z } from "@/lib/zod";
import type { NetworkId } from "@/lib/data/networks";
import { guessOutputSchema } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";

// A player's game at one puzzle, as the page keeps it between visits
// (docs/game.md#game-state): the guesses so far, each the `guess`
// operation's answer. Holds no data, so it runs in the browser.

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
     * Set once a guess at this puzzle was made in the archive, after the
     * puzzle's own day: such a game does not count for the streak. Left out
     * of a game played only on its day.
     */
    archive: z.literal(true).optional(),
});

/** A kept game: its guesses, oldest first, and whether the archive played it. */
export type StoredGame = {
    guesses: ListedGuess[];
    /** A guess was made in the archive, so the game does not count for the streak. */
    archive: boolean;
};

const noGame: StoredGame = { guesses: [], archive: false };

/**
 * The game kept in `raw`. Nothing kept, or anything that is not a game this
 * version wrote, is a game with no guesses yet.
 */
export function parseStoredGame(raw: string | null): StoredGame {
    if (raw == null) {
        return noGame;
    }
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return noGame;
    }
    const parsed = storedGameSchema.safeParse(value);
    return parsed.success
        ? { guesses: parsed.data.guesses, archive: parsed.data.archive === true }
        : noGame;
}

/**
 * `guesses`, oldest first, as `parseStoredGame` reads them back, marked as
 * an archive game when `archive` is set.
 */
export function serializeGame(
    guesses: readonly ListedGuess[],
    archive = false,
): string {
    return JSON.stringify({
        guesses: guesses.map(({ guess, correct, steps, totalMinutes }) => ({
            guess,
            correct,
            steps,
            totalMinutes,
        })),
        ...(archive ? { archive: true } : {}),
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
