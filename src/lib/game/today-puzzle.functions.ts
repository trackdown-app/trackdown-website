import { createServerFn } from "@tanstack/react-start";
import { todayPuzzleInputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";
import { getTodayPuzzle } from "@/lib/game/today-puzzle";

/**
 * The `todayPuzzle` operation for the web; `GET /api/v1/{network}/puzzles/today`
 * is the same for iOS.
 */
export const getTodayPuzzleFn = createServerFn({ method: "GET" })
    .validator(todayPuzzleInputSchema)
    .handler(({ data }) => getTodayPuzzle(data, serviceContext));
