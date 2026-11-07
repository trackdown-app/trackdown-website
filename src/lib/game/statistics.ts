import { gameStatus } from "@/lib/game/game-state";
import type { GameStatus, StoredGame } from "@/lib/game/game-state";
import type { ArchivedPuzzle } from "@/lib/game/schemas";

// A player's record at one network (docs/statistics.md), worked out from the
// games kept on this device. Holds no data, so it runs in the browser.

export type Statistics = {
    /** Games finished, won or lost, at any puzzle. */
    played: number;
    won: number;
    /** `won` of `played`, rounded to a whole percent; 0 before the first game. */
    winPercent: number;
    /** Puzzles won on their own day in a row, up to today's or yesterday's. */
    currentStreak: number;
    /** The longest such run so far. */
    bestStreak: number;
    /** How many games were won in 1, 2, … `maxGuesses` guesses: index 0 is 1. */
    distribution: number[];
    /** How many games ran out of guesses. */
    missed: number;
    /**
     * How today's game went: the guesses it took, `"missed"`, or `null` while
     * it is on or not started. The distribution highlights it.
     */
    today: number | "missed" | null;
};

/** One finished game, as the record counts it. */
type Finished = {
    status: Exclude<GameStatus, "playing">;
    guessCount: number;
    /** Whether it ended on its puzzle's own day. */
    onItsDay: boolean;
};

function finished(
    puzzle: ArchivedPuzzle,
    game: StoredGame | undefined,
    maxGuesses: number,
): Finished | null {
    if (game == null) {
        return null;
    }
    const status = gameStatus(game.guesses, maxGuesses);
    if (status === "playing") {
        return null;
    }
    return {
        status,
        guessCount: game.guesses.length,
        // A game kept before statistics has no day; the archive could not be
        // played then, so it was played on its day.
        onItsDay: game.finishedOn == null || game.finishedOn === puzzle.date,
    };
}

/**
 * The record over `puzzles`, every puzzle up to today's (the `puzzleArchive`
 * operation's answer, oldest first, today's last), from `games`, the kept
 * game at each puzzle number.
 *
 * A streak counts puzzles won on their own day in Europe/Amsterdam. A puzzle
 * lost, not played, or finished on a later day breaks it. Today's puzzle
 * breaks nothing while it is still to play, so the streak runs on from
 * yesterday until the day is over.
 */
export function computeStatistics(
    puzzles: readonly ArchivedPuzzle[],
    games: ReadonlyMap<number, StoredGame>,
    maxGuesses: number,
): Statistics {
    const distribution = Array.from({ length: maxGuesses }, () => 0);
    let won = 0;
    let missed = 0;
    let run = 0;
    let bestStreak = 0;
    let today: Statistics["today"] = null;

    const sorted = [...puzzles].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted.at(-1);

    for (const puzzle of sorted) {
        const game = finished(puzzle, games.get(puzzle.number), maxGuesses);
        const isToday = puzzle === last;

        if (game?.status === "won") {
            won += 1;
            const slot = game.guessCount - 1;
            distribution[slot] = (distribution[slot] ?? 0) + 1;
        } else if (game?.status === "lost") {
            missed += 1;
        }
        if (isToday && game != null) {
            today = game.status === "won" ? game.guessCount : "missed";
        }

        if (game?.status === "won" && game.onItsDay) {
            run += 1;
            bestStreak = Math.max(bestStreak, run);
        } else if (!(isToday && game == null)) {
            run = 0;
        }
    }

    const played = won + missed;
    return {
        played,
        won,
        winPercent: played === 0 ? 0 : Math.round((won / played) * 100),
        currentStreak: run,
        bestStreak,
        distribution,
        missed,
        today,
    };
}
