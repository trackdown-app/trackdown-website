// Marks this module server-only: it reads the game data.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import { nextDate, puzzleDate, puzzleDayStart } from "@/lib/game/puzzle-day";
import { maxGuesses } from "@/lib/game/rules";
import type { TodayPuzzleInput, TodayPuzzleOutput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * Which puzzle is today's in Europe/Amsterdam, how many guesses it allows and
 * when the next one starts. The `todayPuzzle` operation's one service: the
 * server function and `GET /api/v1/{network}/puzzles/today` both answer with
 * what it returns. It never answers the mystery station.
 */
export async function getTodayPuzzle(
    input: TodayPuzzleInput,
    context: ServiceContext,
): Promise<TodayPuzzleOutput> {
    const date = puzzleDate(context.now());
    const puzzles = await context.data.puzzles(input.network);
    const puzzle = puzzles.find((candidate) => candidate.date === date);
    if (puzzle == null) {
        throw new ApiError(
            "not_found",
            `network ${input.network} has no puzzle for ${date}`,
        );
    }
    // Built field by field, so the puzzle's station cannot come along.
    return {
        network: input.network,
        number: puzzle.n,
        date: puzzle.date,
        maxGuesses,
        nextPuzzleAt: puzzleDayStart(nextDate(date)).toISOString(),
    };
}
