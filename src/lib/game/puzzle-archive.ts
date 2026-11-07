// Marks this module server-only: it reads the game data.
import "@tanstack/react-start/server-only";
import { puzzleDate } from "@/lib/game/puzzle-day";
import type { PuzzleArchiveInput, PuzzleArchiveOutput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

/**
 * The number and date of every puzzle up to today's in Europe/Amsterdam,
 * oldest first, so a player can pick one they missed. The `puzzleArchive`
 * operation's one service: the server function and
 * `GET /api/v1/{network}/puzzles` both answer with what it returns. It never
 * answers a mystery station, nor a puzzle after today's.
 */
export async function getPuzzleArchive(
    input: PuzzleArchiveInput,
    context: ServiceContext,
): Promise<PuzzleArchiveOutput> {
    const today = puzzleDate(context.now());
    const puzzles = await context.data.puzzles(input.network);
    return {
        network: input.network,
        // Built field by field, so a puzzle's station cannot come along.
        puzzles: puzzles
            .filter((puzzle) => puzzle.date <= today)
            // `filter` made a new array, so sorting it leaves the data's alone.
            .sort((a, b) => a.n - b.n)
            .map((puzzle) => ({ number: puzzle.n, date: puzzle.date })),
    };
}
